import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { dailyDrawMessage, renderHomeView, shouldFlipInPlace } from "./home";

/**
 * WHY these tests exist: the home screen is the daily ritual presented like a
 * gallery tile — the dealt card sits face-down at the top and is flipped by
 * tapping it, with the card-of-the-day copy below so the card stays above the
 * fold on mobile. The reveal must not rebuild the card: both faces are
 * preloaded in one stack so the idle wobble never restarts, the hidden face
 * stays inert so a name or link never leaks before the deal, and the
 * tap-only reveal (once per day, no rerolls) is pinned. Page navigation lives
 * in the header menu, and the deck grid is absent.
 */
describe("home view", () => {
  it("stacks a preloaded sealed face behind the face-down deal in one card", () => {
    const peekCard = DECK[16]!;
    const html = renderHomeView({}, undefined, undefined, peekCard.id);

    expect(html).toContain('id="home-title"');
    expect(html).toContain('aria-labelledby="home-title"');
    // One persistent stack the store subscription can flip in place.
    expect(html).toContain(`class="daily-draw__card is-peeking" data-flip-card="${peekCard.id}"`);
    expect(html).toContain('class="daily-draw__flip"');
    // The dealt card waits face-down, like a gallery back, and tapping it
    // reveals — there is no separate reveal button.
    expect(html).toContain("daily-draw__side--back");
    expect(html).toContain('data-action="daily-draw"');
    expect(html).toContain("Tap to reveal");
    expect(html).toContain("deck-card-back");
    // The front is preloaded behind the back and stays out of the tab order and
    // the accessibility tree until the flip, so nothing leaks before the deal.
    expect(html).toContain('class="daily-draw__side daily-draw__side--front" inert aria-hidden="true"');
    expect(html).toContain("card-face--sealed");
    expect(html).toContain("card-face__reveal");
    expect(html).not.toContain('class="daily-draw__face"');
    // The card sits in the full-height stage; the hint leads the bottom group
    // (hint, title, message) that stays pinned to the device screen.
    expect(html).toContain('class="daily-draw__stage"');
    expect(html).toContain('class="daily-draw__bottom"');
    expect(html).toContain('class="daily-draw__hint-slot"');
    expect(html.indexOf('class="daily-draw__stage"')).toBeLessThan(html.indexOf('class="daily-draw__bottom"'));
    expect(html.indexOf("Tap to reveal")).toBeLessThan(html.indexOf('id="home-title"'));
    // The card precedes the card-of-the-day copy.
    expect(html.indexOf("daily-draw__card")).toBeLessThan(html.indexOf('id="home-title"'));
    // Page navigation moved to the header menu; the deck grid stays away.
    expect(html).not.toContain('data-action="open-gallery"');
    expect(html).not.toContain('data-action="open-archive"');
    expect(html).not.toContain('id="deck-grid"');
    expect(html).not.toContain('data-action="draw"');
    expect(html).not.toContain("Draw an invitation");
  });

  it("preloads the revealed face and makes the back inert once the card is drawn", () => {
    const card = DECK[16]!;
    const html = renderHomeView(
      { [card.id]: { state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" } },
      card.id,
    );

    expect(html).toContain(`class="daily-draw__card is-revealed" data-flip-card="${card.id}"`);
    // The back is still in the stack (so it keeps its silhouette) but is no
    // longer reachable; the front is the live face.
    expect(html).toContain('class="daily-draw__side daily-draw__side--back" inert aria-hidden="true"');
    expect(html).toContain('class="daily-draw__side daily-draw__side--front"');
    expect(html).not.toContain('daily-draw__side--front" inert');
    expect(html).toContain(`Today&#39;s invitation: ${card.name.replaceAll("'", "&#39;")}.`);
    expect(html).toContain("card-face--sealed");
    expect(html).toContain(card.name.replaceAll("'", "&#39;"));
    expect(html).toContain(`class="card-face__reveal" href="#/card/${card.id}"`);
    expect(html).toContain("Reveal instructions");
    expect(html).not.toContain("Tap to reveal");
    expect(html).not.toContain('class="daily-draw__face"');
  });

  it("announces a failed daily deal as an escaped, focusable alert", () => {
    const html = renderHomeView(undefined, undefined, "Daily draw <failed>");

    expect(html).toContain('data-draw-error="daily" role="alert" tabindex="-1">Daily draw &lt;failed&gt;</p>');
    expect(html).not.toContain(">Daily draw <failed>");
  });
});

describe("daily draw message", () => {
  it("names the revealed card, invites the tap while face-down, and explains the empty deck", () => {
    // WHY: the reveal updates the live message in place rather than rebuilding
    // the view, so the wording must come from one shared source.
    const card = DECK[16]!;
    expect(dailyDrawMessage(card, undefined, true)).toBe(`Today's invitation: ${card.name}.`);
    expect(dailyDrawMessage(undefined, card, true)).toBe("Tap the card to reveal today's invitation.");
    expect(dailyDrawMessage(undefined, undefined, true)).toBe("A date-seeded card, chosen once for today.");
    expect(dailyDrawMessage(undefined, undefined, false)).toBe("Every invitation in this deck has been Lived.");
  });
});

describe("flip-in-place decision", () => {
  it("flips only when the same mounted card turns from back to drawn", () => {
    // WHY: this predicate is the guard that keeps the reveal from rebuilding
    // the DOM and restarting the wobble; it must not fire for any other change.
    expect(shouldFlipInPlace({ cardId: "pleasure-01", revealed: false }, { cardId: "pleasure-01", revealed: true })).toBe(true);
    expect(shouldFlipInPlace(undefined, { cardId: "pleasure-01", revealed: true })).toBe(false);
    expect(shouldFlipInPlace({ cardId: "pleasure-01", revealed: true }, { cardId: "pleasure-01", revealed: true })).toBe(false);
    expect(shouldFlipInPlace({ cardId: "pleasure-01", revealed: false }, { cardId: "beauty-23", revealed: true })).toBe(false);
    expect(shouldFlipInPlace({ cardId: "pleasure-01", revealed: false }, { revealed: false })).toBe(false);
  });
});
