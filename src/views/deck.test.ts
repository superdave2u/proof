import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { filterDeck, renderDeckView, type DeckRecords } from "./deck";

/**
 * WHY these tests exist: the Deck is the player's view of all 52 possible
 * adventures. They protect the concealed/unconcealed boundary, territory and
 * lifecycle filters, and the unfiltered lived count so future UI changes do
 * not accidentally turn the deck into a progress score or lose cards.
 */
describe("deck view", () => {
  it("shows all 52 cards as territory-marked backs without leaking undiscovered names", () => {
    const html = renderDeckView();

    expect((html.match(/class="deck-card-back /g) ?? [])).toHaveLength(52);
    expect((html.match(/data-card-id=/g) ?? [])).toHaveLength(52);
    expect(html).toContain("Pleasure");
    expect(html).toContain("Wild");
    expect(html).toContain("✵");
    expect(html).not.toContain(DECK[0]?.name);
    expect(html).toContain("0 of 52 cards lived.");
    expect(html).toContain('data-action="draw"');
    expect(html).toContain("Draw an adventure");
    expect(html).not.toContain("You have been dealt:");
  });

  it("reveals and announces only the card that was dealt", () => {
    const card = DECK[16]!;
    const html = renderDeckView({ [card.id]: { state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" } }, undefined, card.id);

    expect(html).toContain(`You have been dealt: ${card.name.replaceAll("'", "&#39;")}.`);
    expect(html).toContain('class="draw-reveal__face" data-draw-animation="true" role="group" tabindex="-1"');
    expect(html).toContain('data-state="drawn"');
    expect(html).not.toContain(DECK[0]!.name);
    expect(html).toContain('role="status" aria-live="polite"');
  });

  it("filters by territory and state together while retaining wild as its own territory", () => {
    const records: DeckRecords = {
      "pleasure-01": { state: "drawn" },
      "pleasure-02": { state: "lived", livedAt: "2026-09-22", evidence: { date: "2026-09-22", note: "A day remembered." } },
      "wild-51": { state: "drawn" },
    };

    expect(filterDeck(DECK, records, { territory: "pleasure", state: "drawn" }).map((card) => card.id))
      .toEqual(["pleasure-01"]);
    expect(filterDeck(DECK, records, { territory: "wild", state: "drawn" }).map((card) => card.id))
      .toEqual(["wild-51"]);
    expect(filterDeck(DECK, records, { territory: "all", state: "undiscovered" })).toHaveLength(49);
  });

  it("keeps the lived count deck-wide and reveals supplied drawn and lived records", () => {
    const records: DeckRecords = {
      "pleasure-01": { state: "drawn" },
      "beauty-23": { state: "lived", livedAt: "2026-09-22", evidence: { date: "2026-09-22", note: "Found a quiet color." } },
    };
    const html = renderDeckView(records, { territory: "beauty", state: "lived" });
    const drawnHtml = renderDeckView(records, { territory: "pleasure", state: "drawn" });

    expect(html).toContain("1 of 52 cards lived.");
    expect(html).toContain("Flowers for No Occasion");
    expect(html).toContain("Found a quiet color.");
    expect(drawnHtml).toContain('<div class="deck-card-revealed" data-card-id="pleasure-01" data-state="drawn">');
    expect(drawnHtml).toContain("Drawn");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('for="deck-filter-territory"');
    expect(html).toContain('for="deck-filter-state"');
    expect(html).not.toContain(DECK[0]?.name);
  });

  it("renders a clear empty state when a state filter has no matching cards", () => {
    const html = renderDeckView({}, { territory: "all", state: "lived" });

    expect(html).toContain("No cards match these filters.");
    expect(html).toContain("0 of 52 cards lived.");
  });
});
