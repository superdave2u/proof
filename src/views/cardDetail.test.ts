import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { renderCardFace } from "../components/cardFace";
import { renderCardDetail } from "./cardDetail";

/**
 * WHY these tests exist: card detail is where a revealed adventure becomes an
 * invitation to act. Its contract must preserve the entire card face while
 * offering only the action that matches its lifecycle state, and keep Lived
 * evidence as a clean record rather than turning it into a worn-out trophy.
 */
describe("card detail view", () => {
  it("shows complete card anatomy and a Draw action for undiscovered cards", () => {
    const card = DECK[0]!;
    const html = renderCardDetail(card);

    expect(html).toContain('class="card-detail" data-card-id="pleasure-01" data-state="undiscovered"');
    expect(html).toContain(renderCardFace(card));
    expect(html).toContain(`<h2 class="card-face__name">${card.name}</h2>`);
    expect(html).toContain("<h3>Quest</h3>");
    expect(html).toContain("<h3>Proof of Life</h3>");
    expect(html).toContain("card-art--");
    expect(html.includes("Special Ability")).toBe(Boolean(card.ability));
    expect(html).toContain("<span>Reward</span>");
    expect(html).toContain("card-face__flavor");
    expect(html).toContain('data-action="draw" data-card-id="pleasure-01">Draw</button>');
    expect(html).toContain('data-action="back-to-deck"');
    expect(html).not.toContain("Deposit your Proof of Life");
  });

  it("offers evidence entry for drawn cards without showing Archive-only actions", () => {
    const card = DECK[0]!;
    const html = renderCardDetail(card, { state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" });

    expect(html).toContain('data-state="drawn"');
    expect(html).toContain('data-action="open-evidence" data-card-id="pleasure-01">Deposit your Proof of Life</button>');
    expect(html).not.toContain('data-action="draw"');
    expect(html).not.toContain('data-action="open-archive"');
  });

  it("shows Lived evidence cleanly and offers Archive and return controls", () => {
    const card = DECK[22]!;
    const html = renderCardDetail(card, {
      state: "lived",
      livedAt: "2026-09-22T12:00:00.000Z",
      evidence: { date: "2026-09-22", note: "A <petal> & a quiet hour." },
    });

    expect(html).toContain('data-state="lived"');
    expect(html).toContain("Entered in the Archive");
    expect(html).toContain("A &lt;petal&gt; &amp; a quiet hour.");
    expect(html).toContain('data-action="open-archive" data-card-id="beauty-23">View in the Archive</button>');
    expect(html).toContain('data-action="back-to-deck"');
    expect(html).not.toContain("weathering");
    expect(html).not.toContain("scuffed");
    expect(html).not.toContain('data-action="open-evidence"');
  });

  it("escapes authored identifiers as well as relying on the card face's escaped copy", () => {
    const card = { ...DECK[0]!, id: 'card"><script>alert(1)</script>' };
    const html = renderCardDetail(card);

    expect(html).toContain('data-card-id="card&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
