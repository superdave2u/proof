import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { DEFAULT_FILTERS, filterDeck, type DeckFilters, type DeckRecords } from "./deckShared";
import { renderGalleryView } from "./gallery";

/**
 * WHY these tests exist: the Gallery is the dedicated page for the whole deck —
 * the random deal ritual plus all 52 cards with their territory/lifecycle
 * filters. These assertions keep the once-per-day logic off this page, keep the
 * concealed/unconcealed boundary intact, protect the face-up preview links into
 * card detail, and preserve the deck-wide lived count so the deck never becomes
 * a score.
 */
describe("gallery view", () => {
  it("shows the full deck as 52 territory-marked backs without leaking undiscovered names", () => {
    const html = renderGalleryView();

    expect(html).toContain('<h2 id="gallery-title" tabindex="-1">');
    expect((html.match(/class="deck-card-back /g) ?? [])).toHaveLength(52);
    expect((html.match(/data-card-id=/g) ?? [])).toHaveLength(52);
    expect(html).toContain("Pleasure");
    expect(html).toContain("Wild");
    expect(html).toContain("✵");
    expect(html).not.toContain(DECK[0]?.name);
    expect(html).toContain("0 of 52 cards lived.");
    expect(html).not.toContain('data-action="draw"');
    expect(html).not.toContain("Draw an invitation");
    expect(html).not.toContain("draw-ritual");
    expect(html).not.toContain("daily-draw");
    expect(html).toContain('data-action="back-to-deck"');
  });

  it("offers a manual flip for undiscovered cards only in local development", () => {
    const devHtml = renderGalleryView({}, DEFAULT_FILTERS, true);

    expect((devHtml.match(/data-action="flip-card"/g) ?? [])).toHaveLength(52);
    expect(renderGalleryView()).not.toContain('data-action="flip-card"');

    const partlyRevealed = renderGalleryView({ "pleasure-01": { state: "drawn" } }, DEFAULT_FILTERS, true);
    expect((partlyRevealed.match(/data-action="flip-card"/g) ?? [])).toHaveLength(51);
  });

  it("keeps the lived count deck-wide and shows face-up records as compact preview links", () => {    const records: DeckRecords = {
      "pleasure-01": { state: "drawn" },
      "beauty-23": { state: "lived", livedAt: "2026-09-22", evidence: { date: "2026-09-22", note: "Found a quiet color." } },
    };
    const html = renderGalleryView(records);

    expect(html).toContain("1 of 52 cards lived.");
    expect(html).toContain('<div class="deck-card-revealed" data-card-id="pleasure-01" data-state="drawn">');
    // WHY: a face-up card implies "Drawn"; "Lived" is not implied and stays labeled.
    expect(html).not.toContain("deck-card-revealed__state\">Drawn");
    expect(html).toContain("Lived · in the Archive");
    // Previews stop at the flavor window and link to the detail page.
    expect(html).toContain('class="deck-card-revealed__link" href="#/card/pleasure-01"');
    expect(html).toContain("card-face--preview");
    expect(html).not.toContain("<h3>Quest</h3>");
    expect(html).not.toContain("data-evidence-form=");
    expect(html).not.toContain('data-action="open-evidence"');
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

  it("renders only matching cards and the deck-wide lived count under filters", () => {
    const records: DeckRecords = {
      "pleasure-01": { state: "drawn" },
      "beauty-23": { state: "lived", livedAt: "2026-09-22", evidence: { date: "2026-09-22", note: "Found a quiet color." } },
    };
    const html = renderGalleryView(records, { territory: "beauty", state: "lived" } satisfies DeckFilters);

    expect(html).toContain("1 of 52 cards lived.");
    expect(html).toContain("Flowers for No Occasion");
    // Evidence notes live on the detail page; the gallery preview stays compact.
    expect(html).not.toContain("Found a quiet color.");
    expect(html).toContain('href="#/card/beauty-23"');
    expect(html).not.toContain("The Ridiculous Dessert");
  });

  it("renders a clear empty state when a state filter has no matching cards", () => {
    const html = renderGalleryView({}, { territory: "all", state: "lived" });

    expect(html).toContain("No cards match these filters.");
    expect(html).toContain("0 of 52 cards lived.");
  });
});
