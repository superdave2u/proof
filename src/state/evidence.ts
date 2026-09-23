export interface Evidence {
  date: string;
  note: string;
  artifact?: string;
}

/**
 * Keep each optional photo small enough to remain practical in the versioned
 * localStorage deck record. The UI checks File.size before reading; the store
 * rechecks decoded bytes for callers and persisted data.
 */
export const MAX_ARTIFACT_BYTES = 512 * 1024;

const artifactPattern = /^data:image\/(png|jpeg|webp|gif);base64,((?:[a-z\d+/]{4})*(?:[a-z\d+/]{2}==|[a-z\d+/]{3}=)?)$/i;

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
  return decodedBytes > 0 && decodedBytes <= MAX_ARTIFACT_BYTES;
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
