import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { filterDeck, renderDeckView, type DeckRecords } from "./deck";

/**
 * WHY these tests exist: the Deck is the player's view of all 52 possible
 * adventures. They protect the once-per-day reveal alongside the repeatable
 * random ritual, the concealed/unconcealed boundary, territory and lifecycle
 * filters, and the unfiltered lived count so UI changes preserve the game's
 * no-reroll promise without turning the deck into a score or losing cards.
 * They also protect the evidence entry action from disappearing on drawn cards
 * and make the date/note/photo requirements and photo cap visible to players.
 */
describe("deck view", () => {
  it("shows all 52 cards as territory-marked backs without leaking undiscovered names", () => {
    const html = renderDeckView();

    expect(html).toContain('<h2 id="deck-title" tabindex="-1">');
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
    expect(html).toContain('data-action="open-card" data-card-id="curiosity-17">Open card details</button>');
    expect(html).not.toContain(DECK[0]!.name);
    expect(html).toContain('role="status" aria-live="polite"');
  });

  it("offers one date-seeded reveal and keeps the chosen card visibly locked for the day", () => {
    const untouched = renderDeckView();
    expect(untouched).toContain('data-action="daily-draw"');
    expect(untouched).toContain("Reveal today's adventure");
    expect(untouched).toContain("chosen once for today");
    expect(untouched).not.toContain(`Today's adventure: ${DECK[0]!.name}.`);

    const card = DECK[16]!;
    const revealed = renderDeckView(
      { [card.id]: { state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" } },
      undefined,
      undefined,
      card.id,
    );
    expect(revealed).toContain(`Today&#39;s adventure: ${card.name.replaceAll("'", "&#39;")}.`);
    expect(revealed).toContain('class="daily-draw__face" data-draw-animation="true" role="group" tabindex="-1"');
    expect(revealed).toContain('data-action="daily-draw" disabled');
    expect(revealed).toContain(`data-action="open-card" data-card-id="${card.id}">Open card details</button>`);
    expect(revealed).toContain("Today's card is revealed");
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
    expect(drawnHtml).toContain('data-action="open-card" data-card-id="pleasure-01">Open card details</button>');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('for="deck-filter-territory"');
    expect(html).toContain('for="deck-filter-state"');
    expect(html).not.toContain(DECK[0]?.name);
  });

  it("offers an evidence form only for a Drawn card with optional capped photo input", () => {
    const card = DECK[0]!;
    const html = renderDeckView({ [card.id]: { state: "drawn" } }, undefined, undefined, undefined, card.id);

    expect(html).toContain('data-action="open-evidence" data-card-id="pleasure-01"');
    expect(html).toContain('data-evidence-form="pleasure-01"');
    expect(html).toContain('name="date" type="date"');
    expect(html).toContain('name="note" rows="3" required');
    expect(html).toContain('name="artifact" type="file" accept="image/png,image/jpeg,image/webp,image/gif"');
    expect(html).toContain("512 KiB");
    expect(renderDeckView().includes('data-evidence-form=')).toBe(false);
  });

  it("renders a clear empty state when a state filter has no matching cards", () => {
    const html = renderDeckView({}, { territory: "all", state: "lived" });

    expect(html).toContain("No cards match these filters.");
    expect(html).toContain("0 of 52 cards lived.");
  });
});
