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
