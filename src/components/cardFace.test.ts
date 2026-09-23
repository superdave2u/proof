import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { renderCardFace } from "./cardFace";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/**
 * WHY these tests exist: the card face is the game's primary object, so these
 * assertions guard complete anatomy across the actual 52-card deck, distinct
 * wild rarity treatment, safe rendering of authored text including multiline
 * proof, and the clean evidence record that gives a lived face meaning without
 * simulated wear.
 */
describe("renderCardFace", () => {
  it("renders every card's identity and complete face anatomy", () => {
    for (const card of DECK) {
      const html = renderCardFace(card);

      expect(html).toContain(`data-card-id="${card.id}"`);
      expect(html).toContain(`${String(card.number).padStart(2, "0")}/52`);
      expect(html).toContain(escapeHtml(card.name));
      expect(html).toContain(escapeHtml(card.typeLine));
      expect(html).toContain(`card-atmosphere--${card.territory}`);
      // The art window was replaced by a territory atmosphere pattern; the
      // authored art-direction string is not rendered on the face.
      expect(html).not.toContain(escapeHtml(card.art));
      expect(html).toContain(card.proof.split("\n").map(escapeHtml).join("<br>"));
      expect(html).toContain(escapeHtml(card.reward));
      expect(html).toContain(escapeHtml(card.flavor));
      for (const step of card.quest) expect(html).toContain(escapeHtml(step));
      expect(html).toContain("<h3>Quest</h3>");
      expect(html).toContain("<h3>Proof of Life</h3>");
      expect(html.includes("Special Ability")).toBe(Boolean(card.ability));
      if (card.ability) {
        expect(html).toContain(escapeHtml(card.ability.name));
        expect(html).toContain(escapeHtml(card.ability.text));
      }
      expect(html).toContain(`rarity--${card.rarity}`);
    }
  });

  it("fills the atmosphere panel with flavor text instead of artwork", () => {
    // WHY: the art window was replaced by a territory-pattern panel; flavor
    // text now flexes into that 4:3 space, so it must render inside the panel.
    const card = DECK[0]!;
    const html = renderCardFace(card);
    const panel = html.slice(html.indexOf('class="card-atmosphere'), html.indexOf("</figure>"));

    expect(panel).toContain("card-atmosphere__sigil");
    expect(panel).toContain("card-atmosphere__flavor");
    expect(panel).toContain(escapeHtml(card.flavor));
    // No scene-art leftovers: no illustration layers or flavor footer remain.
    expect(html).not.toContain("card-art");
    expect(html).not.toContain("card-face__flavor");
  });

  it("gives both wild cards their prismatic and legendary/mythic identities", () => {
    const legendary = renderCardFace(DECK.find((card) => card.number === 51)!);
    const mythic = renderCardFace(DECK.find((card) => card.number === 52)!);

    expect(legendary).toContain("card-face--legendary");
    expect(legendary).toContain("✵");
    expect(mythic).toContain("card-face--mythic");
    expect(mythic).toContain("✵");
    expect(mythic).toContain("Proof of Life");
  });

  it("renders card 52's complete proof with explicit line breaks", () => {
    // WHY: card 52's proof includes two required statements that must remain
    // separate lines in the card face rather than collapsing into one sentence.
    const card52 = DECK.find((card) => card.number === 52)!;
    const html = renderCardFace(card52);

    expect(html).toContain(
      '<section class="card-section card-section--proof"><h3>Proof of Life</h3><p>Bring back one artifact. Write upon it:<br>I WANTED THIS.<br>THAT WAS ENOUGH.</p></section>',
    );
  });

  it("escapes authored copy and presents lived evidence cleanly", () => {
    const card = { ...DECK[0]!, name: "Dessert <script>alert('x')</script>" };
    const html = renderCardFace(card, {
      state: "lived",
      evidence: { date: "2026-09-22", note: "A quiet <evening> & good cake." },
    });

    expect(html).toContain("Dessert &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Entered in the Archive");
    expect(html).toContain("2026-09-22");
    expect(html).toContain("A quiet &lt;evening&gt; &amp; good cake.");
    expect(html).not.toContain("weathering");
  });

  it("records card 52's required words in the clean lived presentation", () => {
    const card52 = DECK.find((card) => card.number === 52)!;
    const html = renderCardFace(card52, {
      state: "lived",
      evidence: { date: "2026-09-22", note: "The walk was enough." },
    });

    expect(html).toContain("I WANTED THIS.");
    expect(html).toContain("THAT WAS ENOUGH.");
    expect(html).toContain("The walk was enough.");
  });
});
