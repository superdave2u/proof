import { describe, expect, it } from "vitest";
import { DECK, territories } from "./cards";
import { EXPECTED_TERRITORY_META, loadSpecDeck } from "./specDeck";

/**
 * WHY this suite exists: the application deck is a static transcription of
 * frozen operator content, so it must remain byte-for-word equivalent to the
 * parsed specs while also supplying the rarity omitted from those specs. This
 * catches transcription drift before card text reaches the player.
 */
describe("application deck data", () => {
  it("transcribes every frozen spec card without losing content or structure", () => {
    const specDeck = loadSpecDeck();

    expect(DECK).toHaveLength(52);
    expect(DECK.map((card) => card.number)).toEqual(
      Array.from({ length: 52 }, (_, index) => index + 1),
    );
    expect(new Set(DECK.map((card) => card.id)).size).toBe(52);
    expect(new Set(DECK.map((card) => card.name.toLocaleLowerCase())).size).toBe(52);

    for (const [index, card] of DECK.entries()) {
      const spec = specDeck.cards[index]!;
      expect(card.id, `card ${card.number} id`).toBe(spec.id);
      expect(card.number, `card ${card.number} number`).toBe(spec.number);
      expect(card.territory, card.id).toBe(spec.territory);
      expect(card.name.toLocaleUpperCase(), card.id).toBe(spec.title);
      expect(card.typeLine, card.id).toBe(spec.typeLine);
      expect(card.quest, card.id).toEqual(spec.quest);
      expect(card.proof, card.id).toBe(spec.proof);
      expect(card.art, card.id).toBe(spec.art);
      expect(card.flavor, card.id).toBe(spec.flavor);
      expect(card.ability, card.id).toEqual(spec.ability);
      // Wilds carry a Special Stretch beside their rarity ability; it must
      // survive transcription or the app never shows it.
      expect(card.stretch, card.id).toEqual(spec.stretch);
    }
  });

  it("lets every Proof use a photograph of the invitation or its completion", () => {
    // WHY: Proof must not exclude a photograph when the player wants to keep
    // visual evidence of the invitation; this also protects alternate Quest
    // branches from proofs that demand inaccessible physical artifacts.
    for (const card of DECK) {
      expect(card.proof, card.id).toMatch(/photo|image/i);
    }
  });

  it("publishes the expected territory metadata and 5/3/2 rarity distribution", () => {
    expect(territories).toHaveLength(EXPECTED_TERRITORY_META.length);
    for (const [index, meta] of territories.entries()) {
      const expected = EXPECTED_TERRITORY_META[index]!;
      expect(meta.territory).toBe(expected.territory);
      expect(meta.color).toBe(expected.color);
      expect(meta.symbol).toBe(expected.symbol);
      expect(meta.energy).toBe(expected.energy);
      expect(meta.range).toEqual(expected.range);

      const rarityCounts = new Map<string, number>();
      for (const card of DECK.filter((item) => item.territory === meta.territory)) {
        rarityCounts.set(card.rarity, (rarityCounts.get(card.rarity) ?? 0) + 1);
      }

      if (meta.territory === "wild") {
        expect([...rarityCounts]).toEqual([
          ["legendary", 1],
          ["mythic", 1],
        ]);
      } else {
        expect([...rarityCounts]).toEqual([
          ["common", 5],
          ["uncommon", 3],
          ["rare", 2],
        ]);
      }
    }
  });
});
