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
 * WHY this suite exists: the deck IS the product and specs/cards/*.md is its
 * authored source of truth. This is the deck integrity pass from fix_plan.md,
 * kept as a permanent audit: before (and after) any data pipeline or UI
 * consumes the deck, it proves the source deck is structurally sound —
 * exactly 52 cards, numbering 01–52 with no gaps or duplicates, 10 cards per
 * territory + 2 wilds, globally unique titles and ids, complete anatomy on
 * every card (SPEC §3), Quest lists capped at three bullets, the 7 canon
 * anchors present and marked at their exact numbers and titles (SPEC §4), and
 * no placeholder or stub content anywhere.
 *
 * Ralph loops must not alter the card specs and must report discrepancies in
 * fix_plan.md. Direct operator sessions may revise card text when explicitly
 * requested; when that happens, update this independent canon baseline too.
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
  const INVITATION_TYPE_RE =
    /^(Discovery|Encounter|Indulgence|Pilgrimage|Creation|Offering|Pursuit)$/;
  const WILD_TYPE_RE = /^(Legendary|Mythic) Wild$/;

  it("gives every territory card a complete mode type line", () => {
    for (const card of cards.filter((c) => c.territory !== "wild")) {
      expect(card.typeLine, card.id).toMatch(INVITATION_TYPE_RE);
      expect(card.mode, card.id).toBe(card.typeLine);
    }
  });

  it("gives every wild card the canon Legendary/Mythic Wild type line", () => {
    for (const card of cards.filter((c) => c.territory === "wild")) {
      expect(card.typeLine, card.id).toMatch(WILD_TYPE_RE);
      expect(card.mode, card.id).toBe("Wild");
    }
  });

  it("keeps every Quest to no more than three instruction bullets", () => {
    // WHY: concise, distinct steps keep the invitation clear and actionable;
    // grouped examples or cautions belong in one bullet rather than becoming
    // extra steps.
    for (const card of cards) {
      expect(card.quest.length, `${card.id} quest bullets`).toBeLessThanOrEqual(3);
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
          "Choose a dessert because you want its taste. A small portion, a homemade one, or a familiar favorite counts.",
          "Give the first few bites your attention: taste, texture, temperature.",
          "Stop or continue according to what feels good. There is no portion you have to finish.",
        ],
        proof: "Keep the receipt, wrapper, menu, or photograph the first bite.",
        abilityKind: "special",
        ability: {
          name: "Enough Is Yours",
          text: "Leave a bite if you have had enough, or enjoy the last one without calling yourself good or bad.",
        },
        art: "candlelit European café, extravagant chocolate cake sitting alone on a tiny marble table, evening rain outside, warm amber light, almost magical realism.",
        flavor: "Pleasure does not have to earn its place in your life.",
      },
      17: {
        typeLine: "Discovery",
        quest: [
          'Set aside a free hour or a workable opening. Ask someone: "Where nearby would you send me to see something you love?"',
          "If it fits your access, safety, and budget, follow their suggestion instead of your usual choice. Check practical details; leave reviews unread.",
          "Find out what the place is like without demanding that their taste match yours.",
        ],
        proof: "Return with one artifact from the destination — a photograph counts.",
        abilityKind: "special",
        ability: {
          name: "Stay with the Difference",
          text: "If it is not your kind of place, spend a few comfortable minutes finding what might matter to someone else before leaving.",
        },
        art: "a woman standing at a nighttime crossroads while a stranger sketches directions onto the back of a receipt. One road seems to glow faintly.",
        flavor: "Curiosity begins when you stop needing to know where you're going.",
      },
      23: {
        typeLine: "Offering",
        quest: [
          "Choose flowers simply because you like them. Buy a stem within your means, use something you may responsibly pick, or spend time with flowers where they grow.",
          "Place them where you will see them, or pause to enjoy them there.",
          "There is no occasion to supply.",
        ],
        proof: "Press one responsibly gathered petal and preserve it with this card, or photograph the flowers where they grow.",
        abilityKind: "special",
        ability: {
          name: "Only Your Taste",
          text: "Choose the stem or patch you personally love, even if another would look more impressive to a visitor.",
        },
        art: "an enormous, almost enchanted flower stall appearing unexpectedly on a gray city street.",
        flavor: "Some things should exist simply because they make being alive feel like being alive.",
      },
      32: {
        typeLine: "Encounter",
        quest: [
          'Ask someone older than you, or someone whose past you know little about: "What’s a story from your life I might never have heard?"',
          "If they feel like telling it, listen without steering toward a lesson.",
          "Let the story end where they want it to.",
        ],
        proof: "Write one sentence from their story, if shared, or photograph a detail of where you met without including them unless they agree.",
        abilityKind: "special",
        ability: {
          name: "Inheritance",
          text: 'Ask, "What do you remember most vividly about that day?" Follow the detail they choose.',
        },
        art: "two people across a kitchen table, late-afternoon sunlight, old photographs scattered between them, with scenes from another lifetime almost ghostlike in the background.",
        flavor: "Some treasures can only be inherited by asking.",
      },
      43: {
        typeLine: "Pursuit",
        quest: [
          "During time you can freely use, notice live music you had not planned to hear. If none appears, keep the invitation for another day.",
          "When access and cost work for you, pause or change one nonessential plan and stay for a few songs.",
          "Give the performance your attention without needing to know the artist or explain your taste.",
        ],
        proof: "Bring back a ticket, coaster, napkin, flyer, photograph, or other artifact.",
        abilityKind: "special",
        ability: {
          name: "Encore",
          text: "When your intended departure arrives, check what you want. If you can and wish to stay, let one more song change the plan again.",
        },
        art: "narrow cobblestone alley at night, music represented by glowing golden particles drifting from a doorway.",
        flavor: "Wonder rarely sends a calendar invitation.",
      },
      51: {
        typeLine: "Legendary Wild",
        quest: [
          "Make room for an unplanned stretch of time, perhaps two hours, with a comfortable budget, access needs, and a way home settled.",
          "Begin without choosing an experience to accomplish. Follow something that draws you: a sound, a color, a doorway, a recommendation.",
          "Let what you encounter suggest the next turn, then another. Continue while the time and your body allow; you can wander close to home. Return without requiring a revelation or a remarkable story.",
        ],
        proof: "Return with an object from the unplanned route, or a photograph of one unexpected thing you encountered.",
        abilityKind: "legendary",
        ability: {
          name: "Serendipity",
          text: 'during this invitation, the question "What is the point of this?" has no power.',
        },
        art: "a figure walking away down an unplanned street, threads of light tugging from doorways and alley mouths in different directions, prismatic light refracting off everything.",
        flavor: "You cannot discover what you refuse to wander toward.",
      },
      52: {
        typeLine: "Mythic Wild",
        quest: [
          "Choose something you want to experience even if nobody ever hears about it. Let desire be the reason, whether or not incidental benefits follow.",
          "Go do it within the circumstances of your life. You owe no output, improvement, or impressive account.",
          'Keep an ordinary reminder with the words: "I WANTED THIS. THAT WAS ENOUGH." On a later ordinary day, let it support another small choice you want without first earning it. This brings the invitation into daily life; it does not begin a streak.',
        ],
        proof: "Bring back an ordinary artifact and write on or beside it: I WANTED THIS. THAT WAS ENOUGH. A photograph of the artifact and words counts.",
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

- **Type**: Invitation • Discovery
- **Quest**:
  Take the invitation.
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
    expect(() => parse(validCard.replace("- **Type**: Invitation • Discovery\n", ""))).toThrow(
      'missing **Type**',
    );
  });

  it("rejects stray prose and conflicting or empty abilities", () => {
    expect(() => parse(validCard.replace("- **Art direction**", "unexpected prose\n- **Art direction**"))).toThrow(
      "unexpected unindented content",
    );
    expect(() => parse(validCard.replace(
      "- **Art direction**",
      "- **Special Stretch**: **One** — a rule.\n- **Mythic Ability**: **Two** — another rule.\n- **Art direction**",
    ))).toThrow("more than one ability field");
    expect(() => parse(validCard.replace(
      "- **Art direction**",
      "- **Special Stretch**: **One** — \n- **Art direction**",
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
    /\b(TODO|TBD|TBC|FIXME|XXX|WIP|DRAFT|PLACEHOLDER|LOREM|IPSUM|COMING SOON|FILL IN|FILL ME|TO BE (DECIDED|DEFINED|DETERMINED|WRITTEN|ADDED)|N\/A)\b|\?\?\?|<<[^>]*>>/i;
  // "unfinished" is now ordinary authored vocabulary; only the shouted stub
  // marker is a defect.
  const UNFINISHED_STUB_RE = /\bUNFINISHED\b/;

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
        expect(text, `${card.id}: "${text}"`).not.toMatch(UNFINISHED_STUB_RE);
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
