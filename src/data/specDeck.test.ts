import { describe, expect, it } from "vitest";
import {
  CANON_CARDS,
  EXPECTED_TERRITORY_META,
  SPEC_FILES,
  loadSpecDeck,
  type SpecCard,
} from "./specDeck";

/**
 * WHY this suite exists: the deck IS the product and specs/cards/*.md is
 * frozen operator content. This is the deck integrity pass from fix_plan.md,
 * kept as a permanent audit: before (and after) any data pipeline or UI
 * consumes the deck, it proves the source deck is structurally sound —
 * exactly 52 cards, numbering 01–52 with no gaps or duplicates, 10 cards per
 * territory + 2 wilds, globally unique titles and ids, complete anatomy on
 * every card (SPEC §3), the 7 canon anchors present and marked at their exact
 * numbers and titles (SPEC §4), and no placeholder or stub content anywhere.
 *
 * If any of this fails, the frozen deck was edited or corrupted. That is an
 * operator escalation: report it in fix_plan.md — never "fix" card content in
 * code and never edit the specs.
 */
const deck = loadSpecDeck();
const cards: readonly SpecCard[] = deck.cards;
const byNumber = new Map(cards.map((card) => [card.number, card]));
const sortedNumbers = cards.map((card) => card.number).sort((a, b) => a - b);

describe("deck integrity — structure (SPEC §2)", () => {
  it("holds exactly 52 cards — 10 per territory plus 2 wilds", () => {
    expect(cards).toHaveLength(52);
    for (const meta of EXPECTED_TERRITORY_META) {
      const inTerritory = cards.filter((card) => card.territory === meta.territory);
      expect(inTerritory, meta.territory).toHaveLength(meta.territory === "wild" ? 2 : 10);
    }
  });

  it("numbers the deck 01–52 with no gaps and no duplicates", () => {
    expect(sortedNumbers).toEqual(Array.from({ length: 52 }, (_, i) => i + 1));
  });

  it("gives every card a unique, well-formed collector id", () => {
    const ids = cards.map((card) => card.id);
    expect(new Set(ids).size).toBe(52);
    for (const card of cards) {
      expect(card.id, String(card.number)).toBe(
        `${card.territory}-${String(card.number).padStart(2, "0")}`,
      );
    }
  });

  it("keeps card titles globally unique (case-insensitive)", () => {
    const titles = cards.map((card) => card.title.toLowerCase());
    expect(new Set(titles).size).toBe(52);
  });

  it("parses every spec file's header into territory metadata matching SPEC §2", () => {
    expect(deck.territories.map((meta) => meta.file)).toEqual(
      SPEC_FILES.map((specFile) => specFile.file),
    );
    for (const [index, meta] of deck.territories.entries()) {
      const expected = EXPECTED_TERRITORY_META[index]!;
      expect(meta.territory).toBe(expected.territory);
      expect(meta.color, meta.territory).toBe(expected.color);
      expect(meta.symbol, meta.territory).toBe(expected.symbol);
      expect(meta.energy, meta.territory).toBe(expected.energy);
      expect([...meta.range], meta.territory).toEqual([...expected.range]);
    }
  });

  it("places every card inside its file's declared numbering range", () => {
    for (const meta of deck.territories) {
      for (const card of cards.filter((c) => c.territory === meta.territory)) {
        expect(card.number, card.id).toBeGreaterThanOrEqual(meta.range[0]);
        expect(card.number, card.id).toBeLessThanOrEqual(meta.range[1]);
      }
    }
  });
});

describe("deck integrity — anatomy (SPEC §3)", () => {
  const ADVENTURE_TYPE_RE =
    /^Adventure • (Discovery|Encounter|Indulgence|Pilgrimage|Creation|Offering|Pursuit)$/;
  const WILD_TYPE_RE = /^(Legendary|Mythic) Adventure • Wild$/;

  it("gives every territory card a complete Adventure • Mode type line", () => {
    for (const card of cards.filter((c) => c.territory !== "wild")) {
      expect(card.typeLine, card.id).toMatch(ADVENTURE_TYPE_RE);
      expect(card.mode, card.id).toBe(card.typeLine.split("•")[1]!.trim());
    }
  });

  it("gives every wild card the canon Legendary/Mythic Wild type line", () => {
    for (const card of cards.filter((c) => c.territory === "wild")) {
      expect(card.typeLine, card.id).toMatch(WILD_TYPE_RE);
      expect(card.mode, card.id).toBe("Wild");
    }
  });

  it("gives every card non-empty quest, proof, reward, art and flavor", () => {
    for (const card of cards) {
      expect(card.quest.length, `${card.id} quest steps`).toBeGreaterThan(0);
      for (const step of card.quest) {
        expect(step.trim(), `${card.id} quest step`).not.toBe("");
      }
      expect(card.proof.length, `${card.id} proof`).toBeGreaterThan(0);
      expect(card.reward.length, `${card.id} reward`).toBeGreaterThan(0);
      expect(card.art.length, `${card.id} art`).toBeGreaterThan(0);
      expect(card.flavor.length, `${card.id} flavor`).toBeGreaterThan(0);
    }
  });

  it("keeps wild rarity canon (51 Legendary, 52 Mythic) and leaves territory rarity to the data pass", () => {
    const thread = byNumber.get(51)!;
    const mythic = byNumber.get(52)!;
    expect(thread.rarityTag).toBe("legendary");
    expect(thread.typeLine).toMatch(/^Legendary Adventure • Wild$/);
    expect(mythic.rarityTag).toBe("mythic");
    expect(mythic.typeLine).toMatch(/^Mythic Adventure • Wild$/);
    for (const card of cards.filter((c) => c.territory !== "wild")) {
      // Specs deliberately carry no territory rarity — the 5/3/2 pattern is
      // assigned in the data pass (AGENT.md content rules).
      expect(card.rarityTag, card.id).toBeNull();
    }
  });

  it("makes abilities optional but well-formed when present", () => {
    for (const card of cards) {
      if (card.ability === undefined) {
        expect(card.abilityKind, card.id).toBeNull();
        continue;
      }
      expect(card.abilityKind, card.id).not.toBeNull();
      expect(card.ability.name.length, `${card.id} ability name`).toBeGreaterThan(0);
      expect(card.ability.text.length, `${card.id} ability text`).toBeGreaterThan(0);
    }
    // The wilds carry their canon signature abilities.
    expect(byNumber.get(51)!.ability?.name).toBe("Serendipity");
    expect(byNumber.get(52)!.ability?.name).toBe("Alive");
  });
});

describe("deck integrity — canon anchors (SPEC §4)", () => {
  it("marks exactly the seven canon cards at their exact numbers and titles", () => {
    const canonNumbers = cards
      .filter((card) => card.canon)
      .map((card) => card.number)
      .sort((a, b) => a - b);
    expect(canonNumbers).toEqual(CANON_CARDS.map((canon) => canon.number).sort((a, b) => a - b));
    for (const canon of CANON_CARDS) {
      const card = byNumber.get(canon.number)!;
      expect(card.canon, card.id).toBe(true);
      expect(card.title, card.id).toBe(canon.title);
      expect(card.territory, card.id).toBe(canon.territory);
    }
  });
});

describe("deck integrity — no stubs (SPEC §10 acceptance)", () => {
  /**
   * WHY: acceptance criterion 2 forbids empty fields and placeholders. This
   * catches unfinished content at the source instead of letting a stub card
   * reach players through the data pipeline.
   */
  const PLACEHOLDER_RE =
    /\b(TODO|TBD|TBC|FIXME|XXX|WIP|DRAFT|PLACEHOLDER|LOREM|IPSUM|UNFINISHED|COMING SOON|FILL IN|FILL ME|TO BE (DECIDED|DEFINED|DETERMINED|WRITTEN|ADDED)|N\/A)\b|\?\?\?|<<[^>]*>>/i;

  const textOf = (card: SpecCard): string[] => {
    const parts = [
      card.title,
      card.typeLine,
      card.mode,
      ...card.quest,
      card.proof,
      card.reward,
      card.art,
      card.flavor,
    ];
    if (card.ability) parts.push(card.ability.name, card.ability.text);
    return parts;
  };

  it("contains no placeholder or stub content in any card field", () => {
    for (const card of cards) {
      for (const text of textOf(card)) {
        expect(text, `${card.id}: "${text}"`).not.toMatch(PLACEHOLDER_RE);
      }
    }
  });

  it("leaves no blank field behind", () => {
    for (const card of cards) {
      for (const text of textOf(card)) {
        expect(text.trim().length, card.id).toBeGreaterThan(0);
      }
    }
  });
});
