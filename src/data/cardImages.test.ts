import { describe, expect, it } from "vitest";
import { createCardImageLoader } from "./cardImages";

const VALID_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
const KEY = "./generated/card-images/pleasure-01.json";

/**
 * WHY these tests exist: art is scored lazily and must never break the card
 * face. The registry has to accept a real base64 PNG, treat a missing or
 * invalid artifact as "no art" (falling back to the atmosphere panel), and
 * survive a corrupt module instead of throwing into the render path.
 */
describe("lazy card image registry", () => {
  it("loads the base64 PNG for a generated artifact", async () => {
    const loader = createCardImageLoader({
      [KEY]: async () => ({ default: { dataUrl: VALID_PNG } }),
    });

    await expect(loader.load("pleasure-01")).resolves.toBe(VALID_PNG);
  });

  it("returns undefined when a card has no generated artifact", async () => {
    const loader = createCardImageLoader({});
    await expect(loader.load("pleasure-01")).resolves.toBeUndefined();
  });

  it("rejects payloads that are not a base64 PNG data URL", async () => {
    for (const dataUrl of [
      "https://example.test/card.png",
      "data:image/jpeg;base64,abc",
      "data:image/png;base64,",
      42,
      undefined,
    ]) {
      const loader = createCardImageLoader({
        [KEY]: async () => ({ default: { dataUrl } }),
      });
      await expect(loader.load("pleasure-01")).resolves.toBeUndefined();
    }
  });

  it("degrades to undefined when the artifact module is corrupt or throws", async () => {
    const throwing = createCardImageLoader({
      [KEY]: async () => { throw new Error("corrupt artifact"); },
    });
    const shapeless = createCardImageLoader({ [KEY]: async () => ({}) });

    await expect(throwing.load("pleasure-01")).resolves.toBeUndefined();
    await expect(shapeless.load("pleasure-01")).resolves.toBeUndefined();
  });
});
