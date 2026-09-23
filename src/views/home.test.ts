import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { renderHomeView } from "./home";

/**
 * WHY these tests exist: the home screen is the daily ritual only. Keeping the
 * deck grid and the random deal off this page is a deliberate layout decision,
 * so these assertions pin that boundary: the daily reveal (once per day, no
 * rerolls), the small links to the Gallery and Archive, and nothing else.
 */
describe("home view", () => {
  it("contains only the daily card plus small links — no gallery grid, no random deal", () => {
    const html = renderHomeView();

    expect(html).toContain('id="home-title"');
    expect(html).toContain('aria-labelledby="home-title"');
    expect(html).toContain('data-action="daily-draw"');
    expect(html).toContain("Reveal today's adventure");
    expect(html).toContain('data-action="open-gallery"');
    expect(html).toContain('data-action="open-archive"');
    expect(html).not.toContain('id="deck-grid"');
    expect(html).not.toContain("deck-card-back");
    expect(html).not.toContain("deck-card-revealed");
    expect(html).not.toContain('data-action="draw"');
    expect(html).not.toContain("Draw an adventure");
  });

  it("keeps the revealed daily card locked for the day and linked to its detail page", () => {
    const card = DECK[16]!;
    const html = renderHomeView(
      { [card.id]: { state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" } },
      card.id,
    );

    expect(html).toContain(`Today&#39;s adventure: ${card.name.replaceAll("'", "&#39;")}.`);
    expect(html).toContain('class="daily-draw__face" data-draw-animation="true" role="group" tabindex="-1"');
    expect(html).toContain('data-action="daily-draw" disabled');
    expect(html).toContain(`data-action="open-card" data-card-id="${card.id}">Open card details</button>`);
    expect(html).toContain("Today's card is revealed");
  });

  it("announces a failed daily deal as an escaped, focusable alert", () => {
    const html = renderHomeView(undefined, undefined, "Daily draw <failed>");

    expect(html).toContain('data-draw-error="daily" role="alert" tabindex="-1">Daily draw &lt;failed&gt;</p>');
    expect(html).not.toContain(">Daily draw <failed>");
  });
});
