import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { renderHomeView } from "./home";

/**
 * WHY these tests exist: the home screen is the daily ritual presented like a
 * gallery tile — the dealt card sits face-down at the top and is flipped by
 * tapping it, with the card-of-the-day copy below so the card stays above the
 * fold on mobile. These assertions pin that hierarchy, the tap-only reveal
 * (once per day, no rerolls), and the absence of page navigation (it lives in
 * the header menu) and of the deck grid.
 */
describe("home view", () => {
  it("leads with the face-down deal as a tap target and moves the copy below the card", () => {
    const peekCard = DECK[16]!;
    const html = renderHomeView({}, undefined, undefined, peekCard.id);

    expect(html).toContain('id="home-title"');
    expect(html).toContain('aria-labelledby="home-title"');
    // The dealt card waits face-down, like a gallery back, and tapping it
    // reveals — there is no separate reveal button.
    expect(html).toContain("deck-card-back");
    expect(html).toContain('data-action="daily-draw"');
    expect(html).toContain('data-action="daily-draw"');
    expect(html).toContain("Tap to reveal");
    // The old reveal button is gone; the tap target's own aria-label names the action.
    expect(html).not.toContain('class="daily-draw__button"');
    // The card precedes the card-of-the-day copy.
    expect(html.indexOf("deck-card-back")).toBeLessThan(html.indexOf('id="home-title"'));
    // Page navigation moved to the header menu; the deck grid stays away.
    expect(html).not.toContain('data-action="open-gallery"');
    expect(html).not.toContain('data-action="open-archive"');
    expect(html).not.toContain('id="deck-grid"');
    expect(html).not.toContain("home-links");
    expect(html).not.toContain('data-action="draw"');
    expect(html).not.toContain("Draw an invitation");
  });

  it("shows the revealed card face-up like a gallery preview, linked to its detail page", () => {
    const card = DECK[16]!;
    const html = renderHomeView(
      { [card.id]: { state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" } },
      card.id,
    );

    expect(html).toContain(`Today&#39;s invitation: ${card.name.replaceAll("'", "&#39;")}.`);
    expect(html).toContain('class="daily-draw__face" data-draw-animation="true"');
    expect(html).toContain(`href="#/card/${card.id}"`);
    expect(html).toContain(`aria-label="Today's card: ${card.name.replaceAll("'", "&#39;")} — open card details"`);
    // The revealed preview is the link itself; the old separate button is gone.
    expect(html).not.toContain('data-action="open-card"');
    expect(html).not.toContain('data-action="daily-draw"');
    expect(html).toContain("card-face--preview");
  });

  it("announces a failed daily deal as an escaped, focusable alert", () => {
    const html = renderHomeView(undefined, undefined, "Daily draw <failed>");

    expect(html).toContain('data-draw-error="daily" role="alert" tabindex="-1">Daily draw &lt;failed&gt;</p>');
    expect(html).not.toContain(">Daily draw <failed>");
  });
});