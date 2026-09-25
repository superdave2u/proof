import { DECK, territories, type Card } from "../data/cards";
import { renderCardTile } from "../components/cardTile";
import type { DeckStore } from "../state/store";
import {
  DEFAULT_FILTERS,
  filterDeck,
  stateFor,
  type DeckFilters,
  type DeckRecords,
  type DeckStateFilter,
  type DeckTerritoryFilter,
} from "./deckShared";

function renderCards(cards: readonly Card[], records: DeckRecords, devMode: boolean): string {
  if (cards.length === 0) {
    return '<p class="deck-empty">No cards match these filters. The rest of the deck is still here when you are ready.</p>';
  }

  return cards.map((card) => renderCardTile(card, { record: records[card.id], devMode })).join("");
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

/** Render the dedicated gallery page: the whole deck, dealt only by the daily ritual. */
export function renderGalleryView(
  records: DeckRecords = {},
  filters: DeckFilters = DEFAULT_FILTERS,
  devMode = false,
): string {
  const livedCount = DECK.filter((card) => stateFor(card, records) === "lived").length;
  const visibleCards = filterDeck(DECK, records, filters);

  return `<section class="deck-view" aria-labelledby="gallery-title">
    <div class="deck-view__heading">
      <div>
        <p class="deck-view__eyebrow">The Gallery</p>
        <h2 id="gallery-title" tabindex="-1">Every invitation waits in here.</h2>
        <p class="deck-view__description">A card is an invitation, not an obligation. The evidence is the life that happens along the way.</p>
      </div>
      <div class="deck-view__actions">
        <p class="deck-view__lived-count" aria-label="${livedCount} of ${DECK.length} cards lived"><span>${livedCount}</span> / ${DECK.length}<small>lived</small></p>
      </div>
    </div>
    <div class="deck-controls" role="group" aria-label="Filter the deck">
      <label for="deck-filter-territory">Territory
        <select id="deck-filter-territory" name="territory">${renderTerritoryOptions(filters.territory)}</select>
      </label>
      <label for="deck-filter-state">State
        <select id="deck-filter-state" name="state">${renderStateOptions(filters.state)}</select>
      </label>
    </div>
     <p class="deck-results" id="deck-result-summary" aria-live="polite">${resultSummary(visibleCards.length, livedCount)}</p>
     <div class="deck-grid" id="deck-grid" aria-label="Invitation cards">${renderCards(visibleCards, records, devMode)}</div>
  </section>`;
}

/** Mount the gallery page and return its refresh hook. */
export function mountGalleryView(
  container: HTMLElement,
  store: DeckStore,
  devMode = false,
): () => void {
  let filters = { ...DEFAULT_FILTERS };
  const render = (): void => {
    container.innerHTML = renderGalleryView(store.getRecords(), filters, devMode);
  };
  render();

  container.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const flipButton = target.closest<HTMLButtonElement>('[data-action="flip-card"]');
    const flipCardId = flipButton?.dataset.cardId;
    if (flipCardId) {
      flipButton.disabled = true;
      void (async () => {
        if (await store.revealCard(flipCardId)) {
          container.querySelector<HTMLElement>(`.card-tile[data-card-id="${flipCardId}"] .card-tile__link`)?.focus();
        } else {
          render();
        }
      })();
      return;
    }

    const hideButton = target.closest<HTMLButtonElement>('[data-action="hide-card"]');
    const hideCardId = hideButton?.dataset.cardId;
    if (hideCardId) {
      hideButton.disabled = true;
      void (async () => {
        if (await store.hideCard(hideCardId)) {
          // The store subscription re-rendered the grid; put focus on the
          // restored face-down tile's flip control.
          container.querySelector<HTMLElement>(`.card-tile[data-card-id="${hideCardId}"] .card-tile__dev`)?.focus();
        } else {
          render();
        }
      })();
    }
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
    if (grid) grid.innerHTML = renderCards(cards, records, devMode);
    if (summary) {
      const livedCount = DECK.filter((card) => stateFor(card, records) === "lived").length;
      summary.textContent = resultSummary(cards.length, livedCount);
    }
  });

  return render;
}