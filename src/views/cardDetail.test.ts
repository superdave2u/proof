import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { renderCardDetail } from "./cardDetail";

/**
 * WHY these tests exist: card detail is where a revealed adventure becomes an
 * invitation to act. Its contract must preserve the entire card face while
 * offering only the action that matches its lifecycle state, and keep Lived
 * evidence as a clean record rather than turning it into a worn-out trophy.
 */
describe("card detail view", () => {
  it("keeps undiscovered cards face-down on deep links without leaking their adventure", () => {
    // WHY: the daily deal is the only reveal; a shared hash link must not be
    // able to snoop a card's name, quest, or flavor before the deck deals it.
    const card = DECK[0]!;
    const html = renderCardDetail(card);

    expect(html).toContain('class="card-detail" data-card-id="pleasure-01" data-state="undiscovered"');
    expect(html).toContain('class="deck-card-back deck-card-back--pleasure"');
    expect(html).toContain("Undiscovered");
    expect(html).toContain("Still undiscovered. Its face is shown when the deck deals it.");
    expect(html).not.toContain(card.name);
    expect(html).not.toContain("<h3>Quest</h3>");
    expect(html).not.toContain("<h3>Proof of Life</h3>");
    expect(html).not.toContain("card-art__caption");
    expect(html).not.toContain('data-action="draw"');
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

  it("shows the full face for a drawn card without a draw action", () => {
    const card = DECK[0]!;
    const html = renderCardDetail(card, { state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" });

    expect(html).toContain('data-state="drawn"');
    expect(html).toContain(`<h2 class="card-face__name">${card.name}</h2>`);
    expect(html).toContain("<h3>Quest</h3>");
    expect(html).not.toContain('data-action="draw"');
  });

  it("renders the deposit form here — the only place a card can be marked Lived", () => {
    // WHY: evidence entry lives on card detail so the gallery can stay a
    // compact preview; this is the sole deposit flow.
    const card = DECK[0]!;
    const html = renderCardDetail(card, { state: "drawn" }, { open: true });

    expect(html).toContain('data-evidence-form="pleasure-01"');
    expect(html).toContain('name="date" type="date"');
    expect(html).toContain('name="note" rows="3" required');
    expect(html).toContain('name="artifact" type="file" accept="image/png,image/jpeg,image/webp,image/gif"');
    expect(html).toContain("512 KiB");
    expect(html).toContain('data-action="cancel-evidence"');
    // The manual "Deposit" button is replaced by the form while it is open.
    expect(html).not.toContain('data-action="open-evidence"');
  });

  it("retains an unsaved draft and explains when another tab already Lived the card", () => {
    // WHY: a cross-tab Lived transition must not silently discard the note the
    // user is still typing; the draft is retained, labeled, and non-destructive.
    const card = DECK[0]!;
    const html = renderCardDetail(card, { state: "lived", evidence: { date: "2026-09-22", note: "Already archived." } }, {
      open: true,
      draft: { date: "2026-09-23", note: "My unsaved note." },
    });

    expect(html).toContain("Unsaved Proof of Life draft");
    expect(html).toContain("My unsaved note.");
    expect(html).toContain('data-action="dismiss-evidence-draft"');
    expect(html).not.toContain('data-evidence-form="pleasure-01"');
  });

  it("announces a successful deposit and returns to the normal actions", () => {
    const card = DECK[0]!;
    const html = renderCardDetail(card, { state: "lived", evidence: { date: "2026-09-23", note: "Done." } }, {
      open: false,
      message: "The Ridiculous Dessert is now Lived. Your evidence is in the Archive.",
    });

    expect(html).toContain("is now Lived. Your evidence is in the Archive.");
    expect(html).toContain('data-action="open-archive"');
  });

  it("escapes authored identifiers as well as relying on the card face's escaped copy", () => {
    const card = { ...DECK[0]!, id: 'card"><script>alert(1)</script>' };
    const html = renderCardDetail(card);

    expect(html).toContain('data-card-id="card&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
