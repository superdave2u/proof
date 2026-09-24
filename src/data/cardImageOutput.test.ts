import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { CARD_IMAGE_HEIGHT, CARD_IMAGE_WIDTH, normalizeCardPng, pngDimensions } from "../../scripts/cardImageOutput";

/**
 * WHY these tests exist: providers can ignore aspect-ratio options and return
 * large square images, but the app contract is compact 4:3 PNG. This guards the
 * paid output boundary: every accepted generated image is normalized before it
 * is embedded in the lazily loaded JSON artifact, and pixel metadata reflects
 * the actual bytes rather than the requested generation parameters.
 */
describe("card image output normalization", () => {
  it("center-crops provider output to the exact 800x600 PNG contract", async () => {
    const square = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: { r: 180, g: 60, b: 80 } },
    }).png().toBuffer();

    const normalized = await normalizeCardPng(square);
    const metadata = await sharp(normalized).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(CARD_IMAGE_WIDTH);
    expect(metadata.height).toBe(CARD_IMAGE_HEIGHT);
    expect(pngDimensions(normalized)).toBe("800x600");
  });

  it("shrinks the image payload while keeping an illustration as PNG", async () => {
    const illustration = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: { r: 188, g: 92, b: 43 } },
    }).composite([{
      input: await sharp({
        create: { width: 420, height: 700, channels: 3, background: { r: 205, g: 150, b: 30 } },
      }).png().toBuffer(),
      left: 302,
      top: 162,
    }]).png().toBuffer();

    const normalized = await normalizeCardPng(illustration);
    const metadata = await sharp(normalized).metadata();
    expect(normalized.length).toBeLessThan(illustration.length);
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(600);
  });

  it("does not mistake malformed bytes for a measured image size", () => {
    expect(pngDimensions(new TextEncoder().encode("not a png"))).toBeUndefined();
    expect(pngDimensions(new Uint8Array(30))).toBeUndefined();
    expect(CARD_IMAGE_WIDTH / CARD_IMAGE_HEIGHT).toBe(4 / 3);
  });
});
