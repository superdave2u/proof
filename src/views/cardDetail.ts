import { renderCardFace, type CardFaceRecord } from "../components/cardFace";
import type { Card } from "../data/cards";

export type CardDetailAction = "draw" | "open-evidence" | "open-archive" | "back-to-deck";

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

/** Render one complete card face with state-specific actions and route controls. */
export function renderCardDetail(card: Card, record?: CardFaceRecord, drawError?: string): string {
  const state = record?.state ?? "undiscovered";
  const escapedId = escapeHtml(card.id);

  return `<section class="card-detail" data-card-id="${escapedId}" data-state="${state}" aria-label="Card detail" tabindex="-1">
    <nav class="card-detail__navigation" aria-label="Card detail navigation">
      <button type="button" data-action="back-to-deck">Return to the deck</button>
    </nav>
    ${drawError ? `<p class="draw-storage-error card-detail__error" role="alert" tabindex="-1">${escapeHtml(drawError)}</p>` : ""}
    <div class="card-detail__face">${renderCardFace(card, record)}</div>
    <div class="card-detail__actions" aria-label="Card actions">
      ${renderPrimaryAction(card.id, state)}
    </div>
  </section>`;
}

/** Mount the detail screen and delegate its actions to the owning route/application. */
export function mountCardDetail(
  container: HTMLElement,
  card: Card,
  record: CardFaceRecord | undefined,
  onAction: (action: CardDetailAction, card: Card) => void,
  drawError?: string,
): () => void {
  container.innerHTML = renderCardDetail(card, record, drawError);

  const handleClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const action = target.closest<HTMLButtonElement>("button[data-action]")?.dataset.action;
    if (action === "draw" || action === "open-evidence" || action === "open-archive" || action === "back-to-deck") {
      onAction(action, card);
    }
  };

  container.addEventListener("click", handleClick);
  return () => container.removeEventListener("click", handleClick);
}
