import { renderCardFace, type CardFaceRecord } from "../components/cardFace";
import {
  buildEvidence,
  renderEvidenceForm,
  renderEvidenceSuccess,
  renderRetainedEvidenceDraft,
  type EvidenceDraft,
} from "../components/evidenceForm";
import type { Card } from "../data/cards";
import type { Evidence } from "../state/evidence";

export type CardDetailAction = "draw" | "open-evidence" | "open-archive" | "back-to-deck";

/**
 * Evidence entry state is owned by the application (not the mount) so an
 * unsaved deposit draft survives a re-render when another tab changes the
 * card. `file` is kept out of band because a file input cannot be repopulated.
 */
export interface EvidenceEntryState {
  open: boolean;
  error?: string | undefined;
  message?: string | undefined;
  draft?: EvidenceDraft | undefined;
  file?: File | undefined;
}

export interface CardDetailHandlers {
  onAction(action: CardDetailAction, card: Card): void;
  onSubmitEvidence(cardId: string, evidence: Evidence): Promise<boolean>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return character;
    }
  });
}

function renderPrimaryAction(cardId: string, state: CardFaceRecord["state"]): string {
  const escapedId = escapeHtml(cardId);
  switch (state) {
    case "undiscovered":
      return `<button class="card-detail__primary" type="button" data-action="draw" data-card-id="${escapedId}">Draw</button>`;
    case "drawn":
      return `<button class="card-detail__primary" type="button" data-action="open-evidence" data-card-id="${escapedId}">Deposit your Proof of Life</button>`;
    case "lived":
      return `<button class="card-detail__primary" type="button" data-action="open-archive" data-card-id="${escapedId}">View in the Archive</button>`;
  }
}

/** Render one complete card face with state-specific actions and the deposit flow. */
export function renderCardDetail(
  card: Card,
  record?: CardFaceRecord,
  evidence: EvidenceEntryState = { open: false },
  drawError?: string,
): string {
  const state = record?.state ?? "undiscovered";
  const escapedId = escapeHtml(card.id);

  const evidenceSection = !evidence.open
    ? ""
    : state === "lived"
      ? renderRetainedEvidenceDraft(card, evidence.draft, evidence.error)
      : renderEvidenceForm(card, evidence.error, evidence.draft);

  return `<section class="card-detail" data-card-id="${escapedId}" data-state="${state}" aria-label="Card detail" tabindex="-1">
    <nav class="card-detail__navigation" aria-label="Card detail navigation">
      <button type="button" data-action="back-to-deck">Return to the deck</button>
    </nav>
    ${drawError ? `<p class="draw-storage-error card-detail__error" role="alert" tabindex="-1">${escapeHtml(drawError)}</p>` : ""}
    <div class="card-detail__face">${renderCardFace(card, record)}</div>
    ${evidenceSection}
    ${evidence.message && !evidence.open ? renderEvidenceSuccess(evidence.message) : ""}
    ${evidence.open ? "" : `<div class="card-detail__actions" aria-label="Card actions">${renderPrimaryAction(card.id, state)}</div>`}
  </section>`;
}

/** Mount the detail screen, its deposit form, and delegate actions to the owning route/application. */
export function mountCardDetail(
  container: HTMLElement,
  card: Card,
  record: CardFaceRecord | undefined,
  handlers: CardDetailHandlers,
  evidence: EvidenceEntryState = { open: false },
  drawError?: string,
): () => void {
  // Track the record locally so the post-submit re-render shows the new state
  // even before the application's store subscription remounts this view.
  let currentRecord = record;
  const render = (): void => {
    container.innerHTML = renderCardDetail(card, currentRecord, evidence, drawError);
  };
  render();

  const openEvidence = (): void => {
    evidence.open = true;
    evidence.error = undefined;
    evidence.message = undefined;
    render();
    container.querySelector<HTMLElement>(`#evidence-form-${card.id}-title`)?.focus();
  };

  const closeEvidence = (): void => {
    evidence.open = false;
    evidence.error = undefined;
    evidence.draft = undefined;
    evidence.file = undefined;
    render();
  };

  const handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const action = target.closest<HTMLButtonElement>("button[data-action]")?.dataset.action;
    if (action === "draw" || action === "open-archive" || action === "back-to-deck") {
      handlers.onAction(action, card);
    } else if (action === "open-evidence") {
      openEvidence();
    } else if (action === "cancel-evidence" || action === "dismiss-evidence-draft") {
      closeEvidence();
    }
  };

  const handleSubmit = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || !target.matches("[data-evidence-form]")) return;
    event.preventDefault();
    if (!target.reportValidity()) return;

    const dateInput = target.elements.namedItem("date");
    const noteInput = target.elements.namedItem("note");
    const artifactInput = target.elements.namedItem("artifact");
    if (!(dateInput instanceof HTMLInputElement) || !(noteInput instanceof HTMLTextAreaElement)
      || !(artifactInput instanceof HTMLInputElement)) return;

    const file = artifactInput.files?.[0] ?? evidence.file;
    evidence.draft = {
      date: dateInput.value,
      note: noteInput.value,
      ...(file ? { fileName: file.name } : {}),
    };
    evidence.file = file;
    target.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = true; });

    void (async () => {
      try {
        const assembled = await buildEvidence(dateInput.value, noteInput.value, file);
        if (!await handlers.onSubmitEvidence(card.id, assembled)) {
          throw new Error("This card could not be saved in this browser. Your card remains Drawn; check that browser storage is available and has space, then try again.");
        }
        evidence.open = false;
        evidence.error = undefined;
        evidence.draft = undefined;
        evidence.file = undefined;
        evidence.message = `${card.name} is now Lived. Your evidence is in the Archive.`;
        currentRecord = { state: "lived", livedAt: new Date().toISOString(), evidence: assembled };
        render();
        container.querySelector<HTMLElement>(".evidence-entry__success")?.focus();
      } catch (error) {
        evidence.error = error instanceof Error ? error.message : "The artifact could not be read. Try another image.";
        render();
        container.querySelector<HTMLElement>(`#evidence-form-${card.id}-title`)?.focus();
      }
    })();
  };

  container.addEventListener("click", handleClick);
  container.addEventListener("submit", handleSubmit);
  return () => {
    container.removeEventListener("click", handleClick);
    container.removeEventListener("submit", handleSubmit);
  };
}