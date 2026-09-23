import { describe, expect, it } from "vitest";
import { isValidArtifactDataUrl, isValidEvidence, isValidEvidenceDate, MAX_ARTIFACT_BYTES } from "./evidence";

/**
 * WHY these tests exist: evidence becomes durable personal data in localStorage
 * and is later used as an image source. These boundaries protect calendar dates,
 * non-empty evidence notes, image-only base64 payloads, and the size cap that
 * keeps optional artifacts from overwhelming browser storage.
 */
describe("evidence validation", () => {
  it("accepts real calendar dates and rejects impossible dates", () => {
    expect(isValidEvidenceDate("2024-02-29")).toBe(true);
    expect(isValidEvidenceDate("2026-02-29")).toBe(false);
    expect(isValidEvidenceDate("2026-13-01")).toBe(false);
    expect(isValidEvidenceDate("2026-09-2")).toBe(false);
  });

  it("accepts only valid image data URLs within the decoded byte limit", () => {
    expect(isValidArtifactDataUrl("data:image/jpeg;base64,AAAA")).toBe(true);
    expect(isValidArtifactDataUrl("data:image/svg+xml;base64,AAAA")).toBe(false);
    expect(isValidArtifactDataUrl("data:image/png;base64,@@@=")).toBe(false);
    expect(isValidArtifactDataUrl(`data:image/png;base64,${"A".repeat(Math.ceil(MAX_ARTIFACT_BYTES / 3) * 4)}`)).toBe(false);
    expect(isValidArtifactDataUrl("data:image/png;base64,")).toBe(false);
  });

  it("requires a valid date and a meaningful note while keeping a photo optional", () => {
    expect(isValidEvidence({ date: "2026-09-22", note: "The names we learned." })).toBe(true);
    expect(isValidEvidence({ date: "2026-09-22", note: "  " })).toBe(false);
    expect(isValidEvidence({ date: "yesterday", note: "A good day." })).toBe(false);
    expect(isValidEvidence({ date: "2026-09-22", note: "A good day.", artifact: "https://example.com/photo.png" })).toBe(false);
  });
});
