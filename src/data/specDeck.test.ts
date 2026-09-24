import { describe, expect, it } from "vitest";
import {
  CANON_CARDS,
  EXPECTED_TERRITORY_META,
  SPEC_FILES,
  loadSpecDeck,
  parseSpecFile,
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
    /^(Discovery|Encounter|Indulgence|Pilgrimage|Creation|Offering|Pursuit)$/;
  const WILD_TYPE_RE = /^(Legendary|Mythic) Wild$/;

  it("gives every territory card a complete mode type line", () => {
    for (const card of cards.filter((c) => c.territory !== "wild")) {
      expect(card.typeLine, card.id).toMatch(ADVENTURE_TYPE_RE);
      expect(card.mode, card.id).toBe(card.typeLine);
    }
  });

  it("gives every wild card the canon Legendary/Mythic Wild type line", () => {
    for (const card of cards.filter((c) => c.territory === "wild")) {
      expect(card.typeLine, card.id).toMatch(WILD_TYPE_RE);
      expect(card.mode, card.id).toBe("Wild");
    }
  });

  it("gives every card non-empty quest, proof, art and flavor", () => {
    for (const card of cards) {
      expect(card.quest.length, `${card.id} quest steps`).toBeGreaterThan(0);
      for (const step of card.quest) {
        expect(step.trim(), `${card.id} quest step`).not.toBe("");
      }
      expect(card.proof.length, `${card.id} proof`).toBeGreaterThan(0);
      expect(card.art.length, `${card.id} art`).toBeGreaterThan(0);
      expect(card.flavor.length, `${card.id} flavor`).toBeGreaterThan(0);
    }
  });

  it("keeps wild rarity canon (51 Legendary, 52 Mythic) and leaves territory rarity to the data pass", () => {
    const thread = byNumber.get(51)!;
    const mythic = byNumber.get(52)!;
    expect(thread.rarityTag).toBe("legendary");
    expect(thread.typeLine).toMatch(/^Legendary Wild$/);
    expect(mythic.rarityTag).toBe("mythic");
    expect(mythic.typeLine).toMatch(/^Mythic Wild$/);
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

  /**
   * WHY: comparing the application deck to the live Markdown only catches
   * transcription drift. These independent, authored-content baselines also
   * catch a canon edit that is copied into both places, preserving the seven
   * operator-authored anchors verbatim unless an operator intentionally
   * updates the baseline.
   */
  it("preserves every canon card's authored text against an independent baseline", () => {
    const textFor = (card: SpecCard) => ({
      typeLine: card.typeLine,
      quest: card.quest,
      proof: card.proof,
      abilityKind: card.abilityKind,
      ability: card.ability,
      art: card.art,
      flavor: card.flavor,
    });

    const expected: Record<number, ReturnType<typeof textFor>> = {
      1: {
        typeLine: "Indulgence",
        quest: [
          "Find a dessert you would normally talk yourself out of ordering.",
          "Order it.",
          "No sharing required.",
          "Eat it slowly enough to actually experience it.",
        ],
        proof: "Keep the receipt, wrapper, menu, or photograph the first bite.",
        abilityKind: null,
        ability: undefined,
        art: "candlelit European café, extravagant chocolate cake sitting alone on a tiny marble table, evening rain outside, warm amber light, almost magical realism.",
        flavor: "Pleasure does not have to earn its place in your life.",
      },
      17: {
        typeLine: "Discovery",
        quest: [
          'Ask someone: "If I had one free hour around here, where would you send me?"',
          "If their answer is safe and reasonably possible, go.",
          "You may not research it first.",
        ],
        proof: "Return with one artifact from the destination.",
        abilityKind: "special",
        ability: {
          name: "Unknown Territory",
          text: "if you've never heard of the place they recommend, the card gains +1 Wonder.",
        },
        art: "a woman standing at a nighttime crossroads while a stranger sketches directions onto the back of a receipt. One road seems to glow faintly.",
        flavor: "Curiosity begins when you stop needing to know where you're going.",
      },
      23: {
        typeLine: "Offering",
        quest: [
          "Buy flowers.",
          "There may be no birthday.",
          "No anniversary.",
          "No dinner party.",
          "No reason.",
          "Choose entirely by beauty.",
        ],
        proof: "Press one petal and preserve it with this card.",
        abilityKind: "special",
        ability: {
          name: "Useless Beauty",
          text: "you may not explain or justify the purchase.",
        },
        art: "an enormous, almost enchanted flower stall appearing unexpectedly on a gray city street.",
        flavor: "Some things should exist simply because they make being alive feel like being alive.",
      },
      32: {
        typeLine: "Encounter",
        quest: [
          "Find someone older than you.",
          "Ask: \"What's a story from your life you don't think I've ever heard?\"",
          "Then don't steer the conversation.",
          "Listen.",
        ],
        proof: "Write one sentence from their story that you never want to forget.",
        abilityKind: "special",
        ability: {
          name: "Inheritance",
          text: "if the story changes something you believed about this person, write that beneath the first sentence.",
        },
        art: "two people across a kitchen table, late-afternoon sunlight, old photographs scattered between them, with scenes from another lifetime almost ghostlike in the background.",
        flavor: "Some treasures can only be inherited by asking.",
      },
      43: {
        typeLine: "Pursuit",
        quest: [
          "Find live music you did not originally plan to hear.",
          "Follow it.",
          "Stay for three songs.",
        ],
        proof: "Bring back a ticket, coaster, napkin, flyer, photograph, or other artifact.",
        abilityKind: "special",
        ability: {
          name: "Encore",
          text: "if you lose track of time, remain until you naturally want to leave.",
        },
        art: "narrow cobblestone alley at night, music represented by glowing golden particles drifting from a doorway.",
        flavor: "Wonder rarely sends a calendar invitation.",
      },
      51: {
        typeLine: "Legendary Wild",
        quest: [
          "Leave home without choosing a destination.",
          "Notice what pulls at you.",
          "Follow it.",
          "A road.",
          "A smell.",
          "A bookstore.",
          "Music through an open door.",
          "Something strange in a shop window.",
          'A person saying, "You should see…"',
          "Follow the first thread.",
          "Then the next.",
          "Then the next.",
          "Continue for at least two hours.",
        ],
        proof: "Return with one object that could not possibly have entered your life if you'd planned the day.",
        abilityKind: "legendary",
        ability: {
          name: "Serendipity",
          text: 'during this adventure, the question "What is the point of this?" has no power.',
        },
        art: "a figure walking away down an unplanned street, threads of light tugging from doorways and alley mouths in different directions, prismatic light refracting off everything.",
        flavor: "You cannot discover what you refuse to wander toward.",
      },
      52: {
        typeLine: "Mythic Wild",
        quest: [
          "Choose something that produces nothing measurable.",
          "It cannot advance your career.",
          "It cannot make you more efficient.",
          "It cannot solve a problem.",
          "It cannot be chosen primarily because someone else will admire it.",
          "You must still want it if nobody ever knows you did it.",
          "Go do it.",
        ],
        proof: "Bring back one artifact. Write upon it:\nI WANTED THIS.\nTHAT WAS ENOUGH.",
        abilityKind: "mythic",
        ability: {
          name: "Alive",
          text: "this card cannot be completed for points. It cannot be optimized. It cannot be compared with another player's experience. Once lived, place it somewhere you will encounter it again.",
        },
        art: "hands holding a small ordinary object — a stone, a shell, a pressed leaf — glowing softly as if lit from within, the rest of the world dimmed away.",
        flavor: "That space is not outside the work. It is what keeps the work human.",
      },
    };

    for (const canon of CANON_CARDS) {
      expect(textFor(byNumber.get(canon.number)!), `canon card ${canon.number}`).toEqual(
        expected[canon.number],
      );
    }
  });
});

describe("spec parser — malformed content (SPEC §3 contract)", () => {
  /**
   * WHY: the real frozen deck only exercises the happy path. Mutation fixtures
   * prove malformed authored input fails loudly rather than silently dropping
   * content or accepting an incomplete/ambiguous card.
   */
  const validCard = `# PLEASURE — Crimson/Rose · ♥ · Desire · cards 01–10

## 01/52 — TEST CARD

- **Type**: Adventure • Discovery
- **Quest**:
  Take the adventure.
- **Proof of Life**: Keep an artifact.
- **Art direction**: A cinematic scene.
- **Flavor**: "A complete sentence."
`;

  const parse = (source: string) => parseSpecFile("pleasure", "pleasure", source);

  it("rejects unknown, duplicate, and missing anatomy fields", () => {
    // WHY: Reward was removed from the card anatomy; the parser must treat a
    // stray Reward field as an unknown field rather than silently accepting it.
    expect(() => parse(validCard.replace("- **Art direction**", "- **Reward**: Place it in the Archive.\n- **Art direction**"))).toThrow(
      'unknown field "**Reward**"',
    );
    expect(() => parse(validCard.replace("- **Art direction**", "- **Art Directions**"))).toThrow(
      'unknown field "**Art Directions**"',
    );
    expect(() => parse(validCard.replace("- **Proof of Life**: Keep an artifact.", "- **Proof of Life**: Keep an artifact.\n- **Proof of Life**: Again."))).toThrow(
      'repeats field "**Proof of Life**"',
    );
    expect(() => parse(validCard.replace("- **Type**: Adventure • Discovery\n", ""))).toThrow(
      'missing **Type**',
    );
  });

  it("rejects stray prose and conflicting or empty abilities", () => {
    expect(() => parse(validCard.replace("- **Art direction**", "unexpected prose\n- **Art direction**"))).toThrow(
      "unexpected unindented content",
    );
    expect(() => parse(validCard.replace(
      "- **Art direction**",
      "- **Special Ability**: **One** — a rule.\n- **Mythic Ability**: **Two** — another rule.\n- **Art direction**",
    ))).toThrow("more than one ability field");
    expect(() => parse(validCard.replace(
      "- **Art direction**",
      "- **Special Ability**: **One** — \n- **Art direction**",
    ))).toThrow("empty ability name or text");
  });

  it("rejects repeated and contradictory heading markers", () => {
    expect(() => parse(validCard.replace("TEST CARD", "TEST CARD — CANON — CANON"))).toThrow(
      "repeats the CANON heading marker",
    );
    expect(() => parse(validCard.replace("TEST CARD", "TEST CARD — LEGENDARY — MYTHIC"))).toThrow(
      "conflicting or repeated rarity markers",
    );
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
