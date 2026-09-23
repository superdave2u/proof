import { DECK, territories, type Card } from "../data/cards";
import { renderCardFace } from "../components/cardFace";
import { DeckStorageError, type DeckStore } from "../state/store";
import {
  DEFAULT_FILTERS,
  escapeHtml,
  filterDeck,
  stateFor,
  territoryLabel,
  type DeckFilters,
  type DeckRecords,
  type DeckStateFilter,
  type DeckTerritoryFilter,
} from "./deckShared";

function renderCardTile(card: Card, records: DeckRecords): string {
  const record = records[card.id];
  const state = stateFor(card, records);
  const collectorNumber = String(card.number).padStart(2, "0");

  if (state === "undiscovered") {
    const symbol = territories.find((item) => item.territory === card.territory)?.symbol;

    return `<article class="deck-card-back deck-card-back--${card.territory}" data-card-id="${card.id}" data-state="undiscovered" aria-label="${territoryLabel(card)} ${collectorNumber} of 52, undiscovered card">
      <span class="deck-card-back__territory">${territoryLabel(card)}</span>
      <span class="deck-card-back__sigil" aria-hidden="true">${symbol}</span>
      <span class="deck-card-back__number">${collectorNumber}<span aria-hidden="true">/52</span></span>
      <span class="deck-card-back__state">Undiscovered</span>
    </article>`;
  }

  // Face-up cards are compact previews: nothing below the flavor window. The
  // full anatomy and the only deposit flow live on the card detail page, which
  // the whole preview links to.
  // "Drawn" is implied by a face-up card; "Lived" is not, so it stays labeled.
  const stateNote = state === "lived" ? '<p class="deck-card-revealed__state">Lived · in the Archive</p>' : "";

  return `<div class="deck-card-revealed" data-card-id="${card.id}" data-state="${state}">
    ${stateNote}
    <a class="deck-card-revealed__link" href="#/card/${encodeURIComponent(card.id)}" aria-label="${territoryLabel(card)} card ${collectorNumber} of 52: ${card.name} — open card details">
      ${renderCardFace(card, record, { preview: true })}
    </a>
  </div>`;
}

function renderCards(cards: readonly Card[], records: DeckRecords): string {
  if (cards.length === 0) {
    return '<p class="deck-empty">No cards match these filters. The rest of the deck is still here when you are ready.</p>';
  }

  return cards.map((card) => renderCardTile(card, records)).join("");
}

function renderDrawRitual(records: DeckRecords, lastDrawnCardId?: string, drawError?: string): string {
  const card = lastDrawnCardId ? DECK.find((item) => item.id === lastDrawnCardId) : undefined;
  const hasEligibleCard = DECK.some((item) => records[item.id]?.state !== "lived");
  const message = card
    ? `You have been dealt: ${card.name}.`
    : hasEligibleCard
      ? "The deck is ready when you are."
      : "Every adventure in this deck has been Lived.";
  const revealedCard = card
    ? `<div class="draw-reveal__face" data-draw-animation="true" role="group" tabindex="-1" aria-label="Dealt card: ${escapeHtml(card.name)}">${renderCardFace(card, records[card.id])}<button class="card-detail__open" type="button" data-action="open-card" data-card-id="${card.id}">Open card details</button></div>`
    : "";

  return `<section class="draw-ritual" aria-labelledby="draw-ritual-title">
    <div class="draw-ritual__intro">
      <p class="draw-ritual__eyebrow">The deal</p>
      <h2 id="draw-ritual-title">Let the deck deal your next adventure.</h2>
      <p>A random card, not a task list. Take the invitation at your own pace.</p>
    </div>
    <button class="draw-ritual__button" type="button" data-action="draw"${hasEligibleCard ? "" : " disabled"}>Draw an adventure</button>
    <p class="draw-ritual__message" role="status" aria-live="polite">${escapeHtml(message)}</p>
    ${drawError ? `<p class="draw-storage-error" data-draw-error="random" role="alert" tabindex="-1">${escapeHtml(drawError)}</p>` : ""}
    ${revealedCard ? `<div class="draw-reveal">${revealedCard}</div>` : ""}
  </section>`;
}

function resultSummary(visible: number, lived: number): string {
  const cardWord = visible === 1 ? "card" : "cards";
  return `Showing ${visible} ${cardWord}. ${lived} of ${DECK.length} cards lived.`;
}

function renderTerritoryOptions(selected: DeckTerritoryFilter): string {
  return [
    `<option value="all"${selected === "all" ? " selected" : ""}>All territories</option>`,
    ...territories.map(({ territory }) => {
      const name = territory.charAt(0).toUpperCase() + territory.slice(1);
      return `<option value="${territory}"${selected === territory ? " selected" : ""}>${name}</option>`;
    }),
  ].join("");
}

function renderStateOptions(selected: DeckStateFilter): string {
  const options: { value: DeckStateFilter; label: string }[] = [
    { value: "all", label: "All states" },
    { value: "undiscovered", label: "Undiscovered" },
    { value: "drawn", label: "Drawn" },
    { value: "lived", label: "Lived" },
  ];

  return options.map(({ value, label }) =>
    `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`,
  ).join("");
}

function territoryFilter(value: string): DeckTerritoryFilter {
  return value === "all" || territories.some((item) => item.territory === value)
    ? value as DeckTerritoryFilter
    : "all";
}

function stateFilter(value: string): DeckStateFilter {
  return value === "all" || value === "undiscovered" || value === "drawn" || value === "lived"
    ? value
    : "all";
}

/** Render the dedicated gallery page: the random deal plus the whole deck. */
export function renderGalleryView(
  records: DeckRecords = {},
  filters: DeckFilters = DEFAULT_FILTERS,
  lastDrawnCardId?: string,
  randomDrawError?: string,
): string {
  const livedCount = DECK.filter((card) => stateFor(card, records) === "lived").length;
  const visibleCards = filterDeck(DECK, records, filters);

  return `<section class="deck-view" aria-labelledby="gallery-title">
    <div class="deck-view__heading">
      <div>
        <p class="deck-view__eyebrow">The Gallery</p>
        <h2 id="gallery-title" tabindex="-1">Every adventure waits in here.</h2>
        <p class="deck-view__description">A card is an invitation, not an obligation. The evidence is the life that happens along the way.</p>
      </div>
      <div class="deck-view__actions">
        <p class="deck-view__lived-count" aria-label="${livedCount} of ${DECK.length} cards lived"><span>${livedCount}</span> / ${DECK.length}<small>lived</small></p>
        <button class="archive-view__back" type="button" data-action="back-to-deck">Return to the deck</button>
      </div>
    </div>
    ${renderDrawRitual(records, lastDrawnCardId, randomDrawError)}
    <div class="deck-controls" role="group" aria-label="Filter the deck">
      <label for="deck-filter-territory">Territory
        <select id="deck-filter-territory" name="territory">${renderTerritoryOptions(filters.territory)}</select>
      </label>
      <label for="deck-filter-state">State
        <select id="deck-filter-state" name="state">${renderStateOptions(filters.state)}</select>
      </label>
    </div>
     <p class="deck-results" id="deck-result-summary" aria-live="polite">${resultSummary(visibleCards.length, livedCount)}</p>
     <div class="deck-grid" id="deck-grid" aria-label="Adventure cards">${renderCards(visibleCards, records)}</div>
  </section>`;
}

/** Mount the gallery page and return its refresh hook. */
export function mountGalleryView(
  container: HTMLElement,
  store: DeckStore,
  onBackToDeck: () => void,
  onOpenCard: (cardId: string) => void,
): () => void {
  let filters = { ...DEFAULT_FILTERS };
  let lastDrawnCardId: string | undefined;
  let randomDrawError: string | undefined;
  const render = (): void => {
    container.innerHTML = renderGalleryView(store.getRecords(), filters, lastDrawnCardId, randomDrawError);
  };
  render();

  container.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('[data-action="back-to-deck"]')) {
      onBackToDeck();
      return;
    }
    const openCardButton = target.closest<HTMLButtonElement>('[data-action="open-card"]');
    if (openCardButton?.dataset.cardId) {
      onOpenCard(openCardButton.dataset.cardId);
      return;
    }
    if (!target.closest('[data-action="draw"]')) return;

    randomDrawError = undefined;
    void (async () => {
      try {
        const card = await store.draw();
        if (!card) {
          render();
          return;
        }
        lastDrawnCardId = card.id;
        render();
        container.querySelector<HTMLElement>(".draw-reveal__face")?.focus();
      } catch (error) {
        if (!(error instanceof DeckStorageError)) throw error;
        randomDrawError = error.message;
        render();
        container.querySelector<HTMLElement>('[data-draw-error="random"]')?.focus();
      }
    })();
  });

  container.addEventListener("change", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;

    if (target.name === "territory") filters = { ...filters, territory: territoryFilter(target.value) };
    else if (target.name === "state") filters = { ...filters, state: stateFilter(target.value) };
    else return;

    const records = store.getRecords();
    const cards = filterDeck(DECK, records, filters);
    const grid = container.querySelector<HTMLElement>("#deck-grid");
    const summary = container.querySelector<HTMLElement>("#deck-result-summary");
    if (grid) grid.innerHTML = renderCards(cards, records);
    if (summary) {
      const livedCount = DECK.filter((card) => stateFor(card, records) === "lived").length;
      summary.textContent = resultSummary(cards.length, livedCount);
    }
  });

  return render;
}