import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  CARD_IMAGE_HEIGHT,
  CARD_IMAGE_WIDTH,
  normalizeCardPng,
  normalizeProviderImage,
  pngDimensions,
} from "../../scripts/cardImageOutput";

/**
 * WHY these tests exist: providers can ignore aspect-ratio options and return
 * large square images, and the pinned OpenRouter model sometimes ignores
 * `output_format: png` and returns JPEG despite asking for PNG. Both drifts
 * must be normalized at the paid output boundary instead of discarding a paid
 * generation: every accepted image is transcoded into the compact 4:3 PNG the
 * artifact registry requires, bytes are sniffed rather than trusting the
 * reported media type, and undecodable payloads fail with attribution.
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

  it("transcodes a JPEG provider payload into the 800x600 PNG contract", async () => {
    const jpeg = await sharp({
      create: { width: 1024, height: 768, channels: 3, background: { r: 120, g: 150, b: 90 } },
    }).jpeg().toBuffer();

    const normalized = await normalizeProviderImage(
      { bytes: jpeg, media_type: "image/jpeg" },
      "pleasure-01",
    );
    const metadata = await sharp(normalized).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(CARD_IMAGE_WIDTH);
    expect(metadata.height).toBe(CARD_IMAGE_HEIGHT);
    expect(pngDimensions(normalized)).toBe("800x600");
  });

  it("sniffs the actual bytes instead of trusting the reported media type", async () => {
    const png = await sharp({
      create: { width: 512, height: 384, channels: 3, background: { r: 40, g: 90, b: 160 } },
    }).png().toBuffer();

    const normalized = await normalizeProviderImage(
      { bytes: png, media_type: "image/jpeg" },
      "pleasure-01",
    );

    expect((await sharp(normalized).metadata()).format).toBe("png");
  });

  it("rejects undecodable payloads with attribution for the operator", async () => {
    const nonsense = new TextEncoder().encode("this is not an image");

    await expect(
      normalizeProviderImage({ bytes: nonsense, media_type: "image/png" }, "pleasure-01"),
    ).rejects.toThrow(/pleasure-01.*image\/png/);
  });
});
