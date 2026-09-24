import sharp from "sharp";

export const CARD_IMAGE_WIDTH = 800;
export const CARD_IMAGE_HEIGHT = 600;

/**
 * Normalize provider output into the site's compact, exact 4:3 asset contract.
 * Center-cropping matters because the recurring heroine is deliberately framed
 * near center in the approved prompts. Palette PNG preserves the watercolor's
 * colors while making the generated images small enough for local lazy chunks.
 */
export async function normalizeCardPng(source: Uint8Array): Promise<Uint8Array> {
  return sharp(source)
    .resize(CARD_IMAGE_WIDTH, CARD_IMAGE_HEIGHT, { fit: "cover", position: "centre" })
    .png({ palette: true, compressionLevel: 9 })
    .toBuffer();
}

export interface ProviderImage {
  bytes: Uint8Array;
  media_type?: string | undefined;
}

/**
 * Accept whatever raster the provider returned — the pinned model may ignore
 * `output_format: png` and send JPEG — and transcode it into the 800x600
 * palette PNG the artifact registry requires, so a container mismatch never
 * discards a paid generation. The reported media type is attribution only:
 * sharp sniffs the actual bytes, and undecodable payloads fail with the
 * caller's label so the loop can pause for operator review.
 */
export async function normalizeProviderImage(image: ProviderImage, label: string): Promise<Uint8Array> {
  try {
    return await normalizeCardPng(image.bytes);
  } catch (cause) {
    const reported = image.media_type ? ` reported as ${image.media_type}` : "";
    throw new Error(`${label}: provider image${reported} could not be decoded into the 800x600 PNG contract`, { cause });
  }
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function uint32be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! * 0x1000000) + (bytes[offset + 1]! << 16)
    + (bytes[offset + 2]! << 8) + bytes[offset + 3]!;
}

export function pngDimensions(png: Uint8Array): string | undefined {
  if (png.length < 24 || ascii(png, 0, 8) !== "\x89PNG\r\n\x1a\n") return undefined;
  if (ascii(png, 12, 4) !== "IHDR") return undefined;
  return `${uint32be(png, 16)}x${uint32be(png, 20)}`;
}
