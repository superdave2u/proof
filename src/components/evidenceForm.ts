import type { Card } from "../data/cards";
import { isDecodableArtifactDataUrl, isValidEvidence, MAX_ARTIFACT_BYTES, type Evidence } from "../state/evidence";
import { escapeHtml } from "../util/html";

export interface EvidenceDraft {
  date: string;
  note: string;
  fileName?: string;
}

export function localDateValue(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The Proof of Life deposit form. It lives on the card detail page (the only
 * place a card can be marked Lived) so the gallery can stay a compact preview.
 */
export function renderEvidenceForm(card: Card, error?: string, draft?: EvidenceDraft): string {
  const formId = `evidence-form-${card.id}`;
  const today = localDateValue(new Date());
  return `<section class="evidence-entry" aria-labelledby="${formId}-title">
    <h3 id="${formId}-title" tabindex="-1">Deposit your Proof of Life</h3>
    <p>Keep the evidence of the life that happened. A note is required; a photo is optional.</p>
    <form data-evidence-form="${card.id}">
      <label for="${formId}-date">Date lived
        <input id="${formId}-date" name="date" type="date" value="${escapeHtml(draft?.date || today)}" required>
      </label>
      <label for="${formId}-note">Evidence note
        <textarea id="${formId}-note" name="note" rows="3" required placeholder="A sentence, a recipe, a list of names…">${escapeHtml(draft?.note ?? "")}</textarea>
      </label>
      ${draft?.fileName ? `<p class="evidence-entry__file">Selected artifact: ${escapeHtml(draft.fileName)}</p>` : ""}
      <label for="${formId}-artifact">Artifact photo <span>(optional)</span>
        <input id="${formId}-artifact" name="artifact" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
      </label>
      <p class="evidence-entry__hint">Images up to ${Math.floor(MAX_ARTIFACT_BYTES / 1024)} KiB are stored with this card in this browser.</p>
      ${error ? `<p class="evidence-entry__error" role="alert">${escapeHtml(error)}</p>` : ""}
      <div class="evidence-entry__actions">
        <button type="submit">Deposited my Proof of Life</button>
        <button type="button" data-action="cancel-evidence">Keep this card drawn</button>
      </div>
    </form>
  </section>`;
}

/**
 * Shown when another tab completes the card while this tab holds an unsaved
 * deposit draft: the draft is retained and labeled, never silently discarded.
 */
export function renderRetainedEvidenceDraft(card: Card, draft?: EvidenceDraft, error?: string): string {
  const formId = `evidence-form-${card.id}`;
  return `<section class="evidence-entry" aria-labelledby="${formId}-title">
    <h3 id="${formId}-title" tabindex="-1">Unsaved Proof of Life draft</h3>
    <p role="status">Another tab has already deposited this card in the Archive. This draft has not been saved and cannot replace that evidence. Copy anything you want to keep before dismissing it.</p>
    <label for="${formId}-date">Draft date
      <input id="${formId}-date" type="date" value="${escapeHtml(draft?.date ?? "")}" readonly>
    </label>
    <label for="${formId}-note">Draft note
      <textarea id="${formId}-note" rows="3" readonly>${escapeHtml(draft?.note ?? "")}</textarea>
    </label>
    ${draft?.fileName ? `<p id="${formId}-artifact" tabindex="-1">Selected artifact: ${escapeHtml(draft.fileName)} (retained in this tab)</p>` : ""}
    ${error ? `<p class="evidence-entry__error" role="alert">${escapeHtml(error)}</p>` : ""}
    <button type="button" data-action="dismiss-evidence-draft" data-card-id="${card.id}">Dismiss unsaved entry</button>
  </section>`;
}

export function renderEvidenceSuccess(message: string): string {
  return `<p class="evidence-entry__success" tabindex="-1">${escapeHtml(message)}</p>`;
}

function readArtifact(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The selected image could not be read."));
    }, { once: true });
    reader.addEventListener("error", () => reject(new Error("The selected image could not be read.")), { once: true });
    reader.addEventListener("abort", () => reject(new Error("Reading the selected image was cancelled.")), { once: true });
    reader.readAsDataURL(file);
  });
}

/** Validate and assemble evidence from raw form values; throws with a user-facing message. */
export async function buildEvidence(date: string, note: string, file?: File): Promise<Evidence> {
  let evidence: Evidence = { date, note };
  if (file) {
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) {
      throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
    }
    if (file.size <= 0 || file.size > MAX_ARTIFACT_BYTES) {
      throw new Error(`Choose an image no larger than ${Math.floor(MAX_ARTIFACT_BYTES / 1024)} KiB.`);
    }
    const artifact = await readArtifact(file);
    if (!await isDecodableArtifactDataUrl(artifact)) {
      throw new Error("The selected file is not a decodable PNG, JPEG, WebP, or GIF image.");
    }
    evidence = { ...evidence, artifact };
  }
  if (!isValidEvidence(evidence)) {
    throw new Error("Enter a valid date and a note describing the evidence of this adventure.");
  }
  return evidence;
}