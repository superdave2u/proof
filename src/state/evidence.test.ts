import { describe, expect, it } from "vitest";
import { isDecodableArtifactDataUrl, isValidArtifactDataUrl, isValidEvidence, isValidEvidenceDate, MAX_ARTIFACT_BYTES } from "./evidence";

const validPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";
const validGif = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * WHY these tests exist: evidence becomes durable personal data in localStorage
 * and is later used as an image source. These boundaries protect calendar dates,
 * non-empty evidence notes, image bytes that match their declared image format,
 * browser-decodable uploads, and the size cap that keeps optional artifacts
 * from overwhelming browser storage.
 */
describe("evidence validation", () => {
  it("accepts real calendar dates and rejects impossible dates", () => {
    expect(isValidEvidenceDate("2024-02-29")).toBe(true);
    expect(isValidEvidenceDate("2026-02-29")).toBe(false);
    expect(isValidEvidenceDate("2026-13-01")).toBe(false);
    expect(isValidEvidenceDate("2026-09-2")).toBe(false);
  });

  it("checks image signatures and container structure rather than trusting the data URL label", () => {
    expect(isValidArtifactDataUrl(validPng)).toBe(true);
    expect(isValidArtifactDataUrl(validGif)).toBe(true);
    expect(isValidArtifactDataUrl(validPng.replace("image/png", "image/jpeg"))).toBe(false);
    expect(isValidArtifactDataUrl("data:image/jpeg;base64,AAAA")).toBe(false);
    expect(isValidArtifactDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(false);
    expect(isValidArtifactDataUrl(validPng.replace("iZk9HQ", "iZk8HQ"))).toBe(false);
    expect(isValidArtifactDataUrl("data:image/svg+xml;base64,AAAA")).toBe(false);
    expect(isValidArtifactDataUrl("data:image/png;base64,@@@=")).toBe(false);
    expect(isValidArtifactDataUrl(`data:image/png;base64,${"A".repeat(Math.ceil(MAX_ARTIFACT_BYTES / 3) * 4)}`)).toBe(false);
    expect(isValidArtifactDataUrl("data:image/png;base64,")).toBe(false);
  });

  it("requires a successful browser decode with nonzero dimensions before an upload can be archived", async () => {
    const decoded = await isDecodableArtifactDataUrl(validPng, async () => ({ width: 1, height: 1 }));
    const rejected = await isDecodableArtifactDataUrl(validPng, async () => undefined);
    const malformed = await isDecodableArtifactDataUrl("data:image/png;base64,AAAA", async () => ({ width: 1, height: 1 }));
    const zeroSized = await isDecodableArtifactDataUrl(validPng, async () => ({ width: 0, height: 1 }));

    expect(decoded).toBe(true);
    expect(rejected).toBe(false);
    expect(malformed).toBe(false);
    expect(zeroSized).toBe(false);
  });

  it("requires a valid date and a meaningful note while keeping a photo optional", () => {
    expect(isValidEvidence({ date: "2026-09-22", note: "The names we learned." })).toBe(true);
    expect(isValidEvidence({ date: "2026-09-22", note: "  " })).toBe(false);
    expect(isValidEvidence({ date: "yesterday", note: "A good day." })).toBe(false);
    expect(isValidEvidence({ date: "2026-09-22", note: "A good day.", artifact: "https://example.com/photo.png" })).toBe(false);
  });
});
