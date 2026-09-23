export interface Evidence {
  date: string;
  note: string;
  artifact?: string;
}

/**
 * Keep each optional photo small enough to remain practical in the versioned
 * localStorage deck record. The UI checks File.size before reading; the shared
 * validator rechecks decoded bytes, format structure, and upload decodability.
 */
export const MAX_ARTIFACT_BYTES = 512 * 1024;

const artifactPattern = /^data:image\/(png|jpeg|webp|gif);base64,((?:[a-z\d+/]{4})*(?:[a-z\d+/]{2}==|[a-z\d+/]{3}=)?)$/i;
const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64(value: string): Uint8Array | undefined {
  const bytes = new Uint8Array(Math.floor((value.length * 3) / 4) - (value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0));
  let output = 0;
  for (let index = 0; index < value.length; index += 4) {
    const first = base64Alphabet.indexOf(value[index]!);
    const second = base64Alphabet.indexOf(value[index + 1]!);
    const third = value[index + 2] === "=" ? 0 : base64Alphabet.indexOf(value[index + 2]!);
    const fourth = value[index + 3] === "=" ? 0 : base64Alphabet.indexOf(value[index + 3]!);
    if (first < 0 || second < 0 || third < 0 || fourth < 0) return undefined;
    const combined = (first << 18) | (second << 12) | (third << 6) | fourth;
    if (output < bytes.length) bytes[output++] = (combined >>> 16) & 0xff;
    if (output < bytes.length) bytes[output++] = (combined >>> 8) & 0xff;
    if (output < bytes.length) bytes[output++] = combined & 0xff;
  }
  return bytes;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let result = "";
  for (let index = start; index < start + length; index += 1) result += String.fromCharCode(bytes[index]!);
  return result;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset]! * 0x1000000) + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]!) >>> 0;
}

function validPng(bytes: Uint8Array): boolean {
  if (bytes.length < 45 || ascii(bytes, 0, 8) !== "\x89PNG\r\n\x1a\n") return false;
  let offset = 8;
  let sawHeader = false;
  let sawImageData = false;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return false;
    const type = ascii(bytes, offset + 4, 4);
    if (offset === 8 && (type !== "IHDR" || length !== 13)) return false;
    if (type === "IHDR") {
      if (sawHeader || offset !== 8 || readUint32(bytes, offset + 8) === 0 || readUint32(bytes, offset + 12) === 0) return false;
      sawHeader = true;
    } else if (!sawHeader) return false;
    if (type === "IDAT") {
      if (!sawHeader) return false;
      sawImageData ||= length > 0;
    }
    if (type === "IEND") return length === 0 && sawImageData && end === bytes.length && validPngCrc(bytes, offset, length);
    if (!validPngCrc(bytes, offset, length)) return false;
    offset = end;
  }
  return false;
}

function validPngCrc(bytes: Uint8Array, chunkOffset: number, dataLength: number): boolean {
  let crc = 0xffffffff;
  for (let index = chunkOffset + 4; index < chunkOffset + 8 + dataLength; index += 1) {
    crc ^= bytes[index]!;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return ((crc ^ 0xffffffff) >>> 0) === readUint32(bytes, chunkOffset + 8 + dataLength);
}

function validJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return false;
  let offset = 2;
  let sawFrame = false;
  let sawScan = false;
  while (offset < bytes.length - 2) {
    if (bytes[offset] !== 0xff) return false;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++]!;
    if (marker === 0x00 || marker === 0xd8 || marker === 0xd9) return false;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > bytes.length - 2) return false;
    const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
    if (length < 2 || offset + length > bytes.length) return false;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      if (length < 8 || ((bytes[offset + 3]! << 8) | bytes[offset + 4]!) === 0
        || ((bytes[offset + 5]! << 8) | bytes[offset + 6]!) === 0) return false;
      sawFrame = true;
    }
    if (marker === 0xda) {
      if (!sawFrame || length < 6) return false;
      sawScan = true;
      // The entropy-coded scan may contain marker-like bytes escaped as FF 00.
      // The app's browser decoder performs the full coefficient decode before accepting an upload.
      return sawScan && offset + length < bytes.length - 2;
    }
    offset += length;
  }
  return false;
}

function validWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP" || readUint32(bytes, 4) !== bytes.length - 8) return false;
  let offset = 12;
  let sawImageFrame = false;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = readUint32(bytes, offset + 4);
    const end = offset + 8 + length + (length & 1);
    if (end > bytes.length) return false;
    if (type === "VP8 ") {
      if (length < 10 || bytes[offset + 11] !== 0x9d || bytes[offset + 12] !== 0x01 || bytes[offset + 13] !== 0x2a) return false;
      sawImageFrame = true;
    } else if (type === "VP8L") {
      if (length < 5 || bytes[offset + 8] !== 0x2f) return false;
      sawImageFrame = true;
    } else if (type === "VP8X" && length !== 10) return false;
    offset = end;
  }
  return offset === bytes.length && sawImageFrame;
}

function skipGifSubBlocks(bytes: Uint8Array, start: number): number | undefined {
  let offset = start;
  let payloadLength = 0;
  while (offset < bytes.length) {
    const length = bytes[offset++]!;
    if (length === 0) return payloadLength > 0 ? offset : undefined;
    if (offset + length > bytes.length) return undefined;
    payloadLength += length;
    offset += length;
  }
  return undefined;
}

function validGif(bytes: Uint8Array): boolean {
  if (bytes.length < 14 || (ascii(bytes, 0, 6) !== "GIF87a" && ascii(bytes, 0, 6) !== "GIF89a")) return false;
  if ((bytes[6]! | bytes[7]!) === 0 || (bytes[8]! | bytes[9]!) === 0) return false;
  const packed = bytes[10]!;
  let offset = 13 + ((packed & 0x80) ? 3 * (2 ** ((packed & 0x07) + 1)) : 0);
  let sawImage = false;
  while (offset < bytes.length) {
    const block = bytes[offset++]!;
    if (block === 0x3b) return sawImage && offset === bytes.length;
    if (block === 0x21) {
      if (offset >= bytes.length) return false;
      offset += 1; // extension label
      const after = skipGifSubBlocks(bytes, offset);
      if (after === undefined) return false;
      offset = after;
      continue;
    }
    if (block !== 0x2c || offset + 9 > bytes.length) return false;
    const imagePacked = bytes[offset + 8]!;
    offset += 9;
    if (imagePacked & 0x80) offset += 3 * (2 ** ((imagePacked & 0x07) + 1));
    if (offset >= bytes.length || bytes[offset]! < 2 || bytes[offset]! > 8) return false;
    const after = skipGifSubBlocks(bytes, offset + 1);
    if (after === undefined) return false;
    sawImage = true;
    offset = after;
  }
  return false;
}

function hasValidImageBytes(mime: string, base64: string): boolean {
  const bytes = decodeBase64(base64);
  if (!bytes) return false;
  switch (mime.toLowerCase()) {
    case "png": return validPng(bytes);
    case "jpeg": return validJpeg(bytes);
    case "webp": return validWebp(bytes);
    case "gif": return validGif(bytes);
    default: return false;
  }
}

export interface DecodedImageSize {
  width: number;
  height: number;
}

export type ArtifactImageDecoder = (dataUrl: string) => Promise<DecodedImageSize | undefined>;

async function decodeInBrowser(dataUrl: string): Promise<DecodedImageSize | undefined> {
  if (typeof Image === "undefined") return undefined;
  const image = new Image();
  image.src = dataUrl;
  try {
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    return undefined;
  }
}

export function isValidEvidenceDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year! < 1 || month! < 1 || month! > 12) return false;
  const leapYear = year! % 4 === 0 && (year! % 100 !== 0 || year! % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day! >= 1 && day! <= daysInMonth[month! - 1]!;
}

export function isValidArtifactDataUrl(value: string): boolean {
  const match = artifactPattern.exec(value);
  if (!match) return false;
  const base64 = match[2]!;
  if (base64.length === 0) return false;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const decodedBytes = Math.floor((base64.length * 3) / 4) - padding;
  return decodedBytes > 0 && decodedBytes <= MAX_ARTIFACT_BYTES && hasValidImageBytes(match[1]!, base64);
}

/** Validate container bytes synchronously, then require a real browser image decode for uploads. */
export async function isDecodableArtifactDataUrl(
  value: string,
  decode: ArtifactImageDecoder = decodeInBrowser,
): Promise<boolean> {
  if (!isValidArtifactDataUrl(value)) return false;
  try {
    const size = await decode(value);
    return size !== undefined && Number.isInteger(size.width) && Number.isInteger(size.height)
      && size.width > 0 && size.height > 0;
  } catch {
    return false;
  }
}

export function isValidEvidence(value: unknown): value is Evidence {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const evidence = value as Record<string, unknown>;
  if (typeof evidence.date !== "string" || !isValidEvidenceDate(evidence.date)) return false;
  if (typeof evidence.note !== "string" || evidence.note.trim().length === 0) return false;
  if (evidence.artifact !== undefined
    && (typeof evidence.artifact !== "string" || !isValidArtifactDataUrl(evidence.artifact))) return false;
  return true;
}
