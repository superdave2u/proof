import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { renderCardBack, renderCardFace, renderConcealedCardFace, renderSealedCardFace } from "./cardFace";

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
      expect(html).toContain(`card-art--${card.territory}`);
      // The authored art direction drives the image (alt description), it is
      // never dumped onto the face as visible paragraph text.
      expect(html).not.toContain(`>${escapeHtml(card.art)}<`);
      expect(html).toContain(card.proof.split("\n").map(escapeHtml).join("<br>"));
      // The Reward line was removed from the card anatomy entirely.
      expect(html).not.toContain('class="card-face__reward"');
      expect(html).not.toContain("<span>Reward</span>");
      expect(html).toContain(escapeHtml(card.flavor));
      for (const step of card.quest) expect(html).toContain(escapeHtml(step));
      expect(html).toContain("<h3>Quest</h3>");
      expect(html).toContain("<h3>Proof</h3>");
       const proofIndex = html.indexOf('<section class="card-section card-section--proof">');
       const abilityIndex = html.indexOf('<aside class="card-ability">');
       if (card.ability) expect(proofIndex).toBeGreaterThan(abilityIndex);
      expect(html.includes("Special Stretch")).toBe(Boolean(card.ability));
      if (card.ability) {
        expect(html).toContain(escapeHtml(card.ability.name));
        expect(html).toContain(escapeHtml(card.ability.text));
      }
      // Wilds carry both their rarity ability and a Special Stretch, so both
      // authored blocks must reach the face.
      expect(html.includes("Special Stretch")).toBe(
        Boolean(card.ability && card.rarity !== "legendary" && card.rarity !== "mythic") || Boolean(card.stretch),
      );
      if (card.stretch) {
        expect(html).toContain('class="card-ability card-ability--stretch"');
        expect(html).toContain(escapeHtml(card.stretch.name));
        expect(html).toContain(escapeHtml(card.stretch.text));
      }
      expect(html).toContain(`rarity--${card.rarity}`);
    }
  });

  it("renders a face-down back that conceals the invitation completely", () => {
    // WHY: undiscovered cards must be face-down everywhere (gallery tiles and
    // deep-linked detail pages) without leaking name, quest, or flavor.
    const card = DECK[0]!;
    const html = renderCardBack(card);

    expect(html).toContain('class="deck-card-back deck-card-back--pleasure"');
    expect(html).toContain("Pleasure");
    expect(html).toContain("01");
    expect(html).toContain("Undiscovered");
    expect(html).not.toContain(card.name);
    expect(html).not.toContain(card.quest[0]!);
    expect(html).not.toContain(card.flavor);
  });

  it("renders the artwork panel with the flavor as a caption over a dark mask", () => {
    // WHY: the flavor text is no longer free-floating; it becomes the caption
    // pinned to the foot of the 4:3 artwork, separated from the painting by a
    // translucent black mask, and the image is attached lazily (no eager src).
    const card = DECK[0]!;
    const html = renderCardFace(card);
    const panel = html.slice(html.indexOf('class="card-art'), html.indexOf("</figure>"));

    expect(panel).toContain("card-art__image");
    expect(panel).toContain(`data-art-image="${card.id}"`);
    expect(panel).toContain('loading="lazy"');
    expect(panel).toContain('decoding="async"');
    expect(panel).not.toContain("src=");
    expect(panel).toContain("card-art__mask");
    expect(panel).toContain("card-art__caption");
    expect(panel).toContain(escapeHtml(card.flavor));
    expect(panel).toContain("card-art__sigil");
    // The old centered flavor window is gone.
    expect(html).not.toContain("card-atmosphere");
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

  it("layers the sparkle over the mythic face only, on every face shape", () => {
    // WHY: the mythic card shares the legendary foil and is distinguished only
    // by its sparkle layer, so legendary must render none and mythic must
    // sparkle on the detail face, the sealed daily face, and the gallery preview.
    const legendary = DECK.find((card) => card.number === 51)!;
    const mythic = DECK.find((card) => card.number === 52)!;

    expect(renderCardFace(legendary)).not.toContain("card-face__sparkles");
    expect(renderCardFace(mythic)).toContain('class="card-face__sparkles" aria-hidden="true"');
    expect(renderSealedCardFace(mythic)).toContain("card-face__sparkles");
    expect(renderSealedCardFace(legendary)).not.toContain("card-face__sparkles");
    expect(renderConcealedCardFace(mythic)).toContain("card-face__sparkles");
    expect(renderConcealedCardFace(legendary)).not.toContain("card-face__sparkles");
  });

  it("renders card 52's artifact words and photo-compatible proof", () => {
    // WHY: the mythic vow remains part of the physical artifact, while the
    // player may also photograph the artifact and its words as evidence.
    const card52 = DECK.find((card) => card.number === 52)!;
    const html = renderCardFace(card52);

    expect(html).toContain(
      '<section class="card-section card-section--proof"><h3>Proof</h3><p>Bring back an ordinary artifact and write on or beside it: I WANTED THIS. THAT WAS ENOUGH. A photograph of the artifact and words counts.</p></section>',
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

describe("renderSealedCardFace", () => {
  it("shows the single-card layout with everything under the artwork sealed", () => {
    // WHY: the daily reveal presents the dealt invitation at full size but
    // withholds its instructions: the name and artwork show, the text under
    // the artwork is replaced by tonal censor bars, and a button over the bars
    // opens the card detail page where the quest, proof, and deposit flow live.
    const card = DECK[0]!;
    const html = renderSealedCardFace(card);

    expect(html).toContain("card-face--sealed");
    expect(html).toContain(escapeHtml(card.name));
    expect(html).toContain(escapeHtml(card.typeLine));
    expect(html).toContain("card-art__caption");
    expect(html).toContain(escapeHtml(card.flavor));
    expect((html.match(/card-face__censor-bar/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('class="card-face__reveal" href="#/card/pleasure-01"');
    expect(html).toContain("Reveal instructions");
    // Nothing under the artwork may leak: no quest, proof, or stretch text.
    expect(html).not.toContain("<h3>Quest</h3>");
    expect(html).not.toContain("<h3>Proof of Life</h3>");
    for (const step of card.quest) expect(html).not.toContain(escapeHtml(step));
    expect(html).not.toContain(card.proof.split("\n")[0]!);
  });
});
