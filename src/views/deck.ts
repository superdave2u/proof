import { DECK, territories, type Card, type Territory } from "../data/cards";
import { renderCardFace, type CardFaceRecord } from "../components/cardFace";

export type DeckStateFilter = "all" | CardFaceRecord["state"];
export type DeckTerritoryFilter = "all" | Territory;

export interface DeckFilters {
  territory: DeckTerritoryFilter;
  state: DeckStateFilter;
}

export type DeckRecords = Readonly<Record<string, CardFaceRecord | undefined>>;

const DEFAULT_FILTERS: DeckFilters = { territory: "all", state: "all" };

function stateFor(card: Card, records: DeckRecords): CardFaceRecord["state"] {
  return records[card.id]?.state ?? "undiscovered";
}

/** Keep filtering independent of the browser so its combinations stay auditable. */
export function filterDeck(
  cards: readonly Card[],
  records: DeckRecords,
  filters: DeckFilters = DEFAULT_FILTERS,
): Card[] {
  return cards.filter((card) => {
    const matchesTerritory = filters.territory === "all" || card.territory === filters.territory;
    const matchesState = filters.state === "all" || stateFor(card, records) === filters.state;
    return matchesTerritory && matchesState;
  });
}

function renderCardTile(card: Card, records: DeckRecords): string {
  const record = records[card.id];
  const state = stateFor(card, records);
  const collectorNumber = String(card.number).padStart(2, "0");

  if (state === "undiscovered") {
    const territoryName = card.territory.charAt(0).toUpperCase() + card.territory.slice(1);
    const symbol = territories.find((item) => item.territory === card.territory)?.symbol;

    return `<article class="deck-card-back deck-card-back--${card.territory}" data-card-id="${card.id}" data-state="undiscovered" aria-label="${territoryName} ${collectorNumber} of 52, undiscovered card">
      <span class="deck-card-back__territory">${territoryName}</span>
      <span class="deck-card-back__sigil" aria-hidden="true">${symbol}</span>
      <span class="deck-card-back__number">${collectorNumber}<span aria-hidden="true">/52</span></span>
      <span class="deck-card-back__state">Undiscovered</span>
    </article>`;
  }

  return `<div class="deck-card-revealed" data-card-id="${card.id}" data-state="${state}">
    <p class="deck-card-revealed__state">${state === "lived" ? "Lived · in the Archive" : "Drawn"}</p>
    ${renderCardFace(card, record)}
  </div>`;
}

function renderCards(cards: readonly Card[], records: DeckRecords): string {
  if (cards.length === 0) {
    return '<p class="deck-empty">No cards match these filters. The rest of the deck is still here when you are ready.</p>';
  }

  return cards.map((card) => renderCardTile(card, records)).join("");
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

/** Render the home-screen deck; absent records intentionally remain face-down. */
export function renderDeckView(
  records: DeckRecords = {},
  filters: DeckFilters = DEFAULT_FILTERS,
): string {
  const livedCount = DECK.filter((card) => stateFor(card, records) === "lived").length;
  const visibleCards = filterDeck(DECK, records, filters);

  return `<section class="deck-view" aria-labelledby="deck-title">
    <div class="deck-view__heading">
      <div>
        <p class="deck-view__eyebrow">The deck</p>
        <h2 id="deck-title">Your next adventure is in here.</h2>
        <p class="deck-view__description">A card is an invitation, not an obligation. The evidence is the life that happens along the way.</p>
      </div>
      <p class="deck-view__lived-count" aria-label="${livedCount} of ${DECK.length} cards lived"><span>${livedCount}</span> / ${DECK.length}<small>lived</small></p>
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
    <div class="deck-grid" id="deck-grid" aria-label="Adventure cards">${renderCards(visibleCards, records)}</div>
  </section>`;
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

/** Mount a responsive, accessible deck and update only its results when filters change. */
export function mountDeckView(container: HTMLElement, records: DeckRecords = {}): void {
  let filters = { ...DEFAULT_FILTERS };
  container.innerHTML = renderDeckView(records, filters);

  container.addEventListener("change", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;

    if (target.name === "territory") filters = { ...filters, territory: territoryFilter(target.value) };
    else if (target.name === "state") filters = { ...filters, state: stateFilter(target.value) };
    else return;

    const cards = filterDeck(DECK, records, filters);
    const grid = container.querySelector<HTMLElement>("#deck-grid");
    const summary = container.querySelector<HTMLElement>("#deck-result-summary");
    if (grid) grid.innerHTML = renderCards(cards, records);
    if (summary) {
      const livedCount = DECK.filter((card) => stateFor(card, records) === "lived").length;
      summary.textContent = resultSummary(cards.length, livedCount);
    }
  });
}
