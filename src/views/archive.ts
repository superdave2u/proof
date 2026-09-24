import { DECK, type Card } from "../data/cards";
import { renderCardFace, type CardFaceRecord } from "../components/cardFace";
import type { DeckStore } from "../state/store";

export type ArchiveRecords = Readonly<Record<string, CardFaceRecord | undefined>>;

/** Keep only complete Lived records and show the most recently completed first. */
export function filterArchive(cards: readonly Card[], records: ArchiveRecords): Card[] {
  return cards
    .filter((card) => records[card.id]?.state === "lived" && records[card.id]?.evidence !== undefined)
    .slice()
    .sort((left, right) => {
      const leftDate = records[left.id]?.evidence?.date ?? "";
      const rightDate = records[right.id]?.evidence?.date ?? "";
      return rightDate.localeCompare(leftDate) || left.number - right.number;
    });
}

/** Render the evidence collection without showing cards that are not yet Lived. */
export function renderArchiveView(records: ArchiveRecords = {}, cards: readonly Card[] = DECK): string {
  const archivedCards = filterArchive(cards, records);
  const entries = archivedCards.length > 0
    ? `<div class="archive-grid" aria-label="Lived invitation cards">${archivedCards.map((card) =>
      `<div class="archive-entry" data-card-id="${card.id}">${renderCardFace(card, records[card.id])}</div>`,
    ).join("")}</div>`
    : `<p class="archive-empty">Your Archive is waiting for its first piece of evidence. When an invitation is Lived, its card and the evidence you left with it will be gathered here.</p>`;

  return `<section class="archive-view" aria-labelledby="archive-title">
    <header class="archive-view__heading">
      <div>
        <p class="archive-view__eyebrow">The Archive</p>
        <h2 id="archive-title" tabindex="-1">Evidence of a life lived.</h2>
        <p class="archive-view__description">Each card here holds a date, a note, and any artifact you kept. This is the life that happened.</p>
      </div>
    </header>
    ${entries}
  </section>`;
}

/** Mount the collected-evidence gallery and return a refresh hook for newly Lived cards. */
export function mountArchiveView(container: HTMLElement, store: DeckStore): () => void {
  const render = (): void => {
    container.innerHTML = renderArchiveView(store.getRecords());
  };

  render();
  return render;
}
