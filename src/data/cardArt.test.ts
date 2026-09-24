import { describe, expect, it } from "vitest";
import { DECK, territories } from "./cards";
import {
  ART_ASPECT,
  ART_NEGATIVE_PROMPT,
  ART_PALETTES,
  FIGURE_BIBLE,
  buildCardArtPrompt,
  cardArtAlt,
} from "./cardArt";

/**
 * WHY these tests exist: SPEC §3.1 makes the art prompt a contract — every card
 * must resolve a deterministic prompt carrying the one fixed heroine, its own
 * frozen scene and flavor, and its territory palette. If the figure bible drifts
 * or a card's prompt stops including its source strings, the 52-card deck stops
 * reading as one hand-painted world, and this fails loudly.
 */
describe("card art prompt canon", () => {
  it("builds a complete, deterministic prompt for every card", () => {
    for (const card of DECK) {
      const prompt = buildCardArtPrompt(card);

      expect(prompt).toContain(FIGURE_BIBLE);
      expect(prompt).toContain(card.art);
      expect(prompt).toContain(card.flavor);
      expect(prompt).toContain(ART_ASPECT);
      expect(prompt).toContain(ART_NEGATIVE_PROMPT);
      expect(prompt).toContain("Let contours dissolve");
      expect(prompt).toContain("forms suggested rather than crisply described");
      expect(prompt).toContain(ART_PALETTES[card.territory].description);
      expect(buildCardArtPrompt(card)).toBe(prompt);
    }
  });

  it("gives each territory its own palette and the wilds a prismatic one", () => {
    const palettes = territories.map((meta) => ART_PALETTES[meta.territory].description);
    expect(new Set(palettes).size).toBe(territories.length);
    expect(ART_PALETTES.wild.description).toContain("prismatic");

    for (const territory of territories.map((meta) => meta.territory)) {
      const card = DECK.find((item) => item.territory === territory);
      expect(card).toBeDefined();
      expect(buildCardArtPrompt(card!)).toContain(ART_PALETTES[territory].description);
    }
  });

  it("describes a card's art direction only through its accessible alt text", () => {
    const card = DECK[0]!;
    expect(cardArtAlt(card)).toBe(`Watercolor illustration for ${card.name}: ${card.art}`);
  });
});
