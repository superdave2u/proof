import type { Card, Territory } from "../data/cards";
import type { CardFaceRecord } from "../components/cardFace";

export type DeckStateFilter = "all" | CardFaceRecord["state"];
export type DeckTerritoryFilter = "all" | Territory;

export interface DeckFilters {
  territory: DeckTerritoryFilter;
  state: DeckStateFilter;
}

export type DeckRecords = Readonly<Record<string, CardFaceRecord | undefined>>;

export const DEFAULT_FILTERS: DeckFilters = { territory: "all", state: "all" };

export function stateFor(card: Card, records: DeckRecords): CardFaceRecord["state"] {
  return records[card.id]?.state ?? "undiscovered";
}

export function territoryLabel(card: Card): string {
  return card.territory.charAt(0).toUpperCase() + card.territory.slice(1);
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

export { escapeHtml } from "../util/html";
