import type { Card } from "../data/cards";
import { renderCardFace, renderConcealedCardFace, type CardFaceRecord } from "./cardFace";
import { escapeHtml } from "../util/html";

export interface CardTileOptions {
  record?: CardFaceRecord | undefined;
  /** Local development gets a manual flip/hide control so states can be exercised. */
  devMode?: boolean;
}

/**
 * One card as it appears in the Gallery and the Archive. Both views render the
 * same preview-shaped tile; only the state of progress differs, so a card never
 * changes silhouette as it moves from undiscovered to drawn to lived.
 *
 * An undiscovered tile is the concealed preview face (same header/title/art
 * shape) rather than a separate portrait back. A revealed tile links to the
 * card detail page, which is the only place the full anatomy, the evidence
 * record, and the deposit flow live.
 */
export function renderCardTile(card: Card, options: CardTileOptions = {}): string {
  const { record, devMode = false } = options;
  const state = record?.state ?? "undiscovered";
  const escapedId = escapeHtml(card.id);
  const collectorNumber = String(card.number).padStart(2, "0");
  const territoryName = card.territory.charAt(0).toUpperCase() + card.territory.slice(1);
  const territoryLabel = `${territoryName} card ${collectorNumber} of 52`;

  if (state === "undiscovered") {
    const flip = devMode
      ? `<button class="card-tile__dev" type="button" data-action="flip-card" data-card-id="${escapedId}" aria-label="Reveal ${territoryLabel} now (development only)">Flip card</button>`
      : "";
    return `<div class="card-tile card-tile--undiscovered" data-card-id="${escapedId}" data-state="undiscovered">
      ${renderConcealedCardFace(card)}
      ${flip}
    </div>`;
  }

  const stateNote = state === "lived" ? '<p class="card-tile__state">Lived · in the Archive</p>' : "";
  // The dev toggle works both ways; Lived is terminal, so only drawn cards hide.
  const hide = devMode && state === "drawn"
    ? `<button class="card-tile__dev" type="button" data-action="hide-card" data-card-id="${escapedId}" aria-label="Hide ${territoryLabel} again (development only)">Hide card</button>`
    : "";

  return `<div class="card-tile" data-card-id="${escapedId}" data-state="${state}">
    <a class="card-tile__link" href="#/card/${encodeURIComponent(card.id)}" aria-label="${territoryLabel}: ${escapeHtml(card.name)} — open card details">
      ${renderCardFace(card, record, { preview: true })}
    </a>
    ${stateNote}
    ${hide}
  </div>`;
}
