import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { filterDeck, renderDeckView, type DeckRecords } from "./deck";

/**
 * WHY these tests exist: the Deck is the player's view of all 52 possible
 * adventures. They protect the once-per-day reveal alongside the repeatable
 * random ritual, the concealed/unconcealed boundary, territory and lifecycle
 * filters, and the unfiltered lived count so UI changes preserve the game's
 * no-reroll promise without turning the deck into a score or losing cards.
 * They also keep the gallery's face-up cards as compact previews that link to
 * card detail, where the only deposit flow lives.
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

  it("announces random and daily draw persistence failures as escaped, focusable alerts", () => {
    const html = renderDeckView(
      {}, undefined, undefined, undefined,
      "Random draw <failed>", "Daily draw could not be saved.",
    );

    expect(html).toContain('data-draw-error="random" role="alert" tabindex="-1">Random draw &lt;failed&gt;</p>');
    expect(html).toContain('data-draw-error="daily" role="alert" tabindex="-1">Daily draw could not be saved.</p>');
    expect(html).not.toContain("Random draw <failed>");
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
    // Evidence notes live on the detail page; the gallery preview stays compact.
    expect(html).not.toContain("Found a quiet color.");
    expect(html).toContain('href="#/card/beauty-23"');
    expect(drawnHtml).toContain('<div class="deck-card-revealed" data-card-id="pleasure-01" data-state="drawn">');
    // WHY: a revealed card is face up, so the drawn state is implied and must
    // not be labeled on the card; the lived note is not implied and must remain.
    // (The state filter's "Drawn" option is a control, not a card label.)
    expect(drawnHtml).not.toContain("deck-card-revealed__state");
    expect(html).toContain("Lived · in the Archive");
    expect(drawnHtml).toContain('class="deck-card-revealed__link" href="#/card/pleasure-01"');
    expect(drawnHtml).toContain("card-face--preview");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('for="deck-filter-territory"');
    expect(html).toContain('for="deck-filter-state"');
    expect(html).not.toContain(DECK[0]?.name);
  });

  it("renders gallery face-up cards as compact previews with no deposit flow", () => {
    // WHY: the gallery previews stop at the flavor window; the full anatomy and
    // the only deposit form live on the card detail page the preview links to.
    const card = DECK[0]!;
    const html = renderDeckView({ [card.id]: { state: "drawn" } });

    expect(html).toContain(`href="#/card/${card.id}"`);
    expect(html).toContain("card-face--preview");
    expect(html).toContain("card-atmosphere__flavor");
    expect(html).not.toContain("<h3>Quest</h3>");
    expect(html).not.toContain("<h3>Proof of Life</h3>");
    expect(html).not.toContain("data-evidence-form=");
    expect(html).not.toContain('data-action="open-evidence"');
  });

  it("renders a clear empty state when a state filter has no matching cards", () => {
    const html = renderDeckView({}, { territory: "all", state: "lived" });

    expect(html).toContain("No cards match these filters.");
    expect(html).toContain("0 of 52 cards lived.");
  });
});
