/**
 * specDeck.ts — the authored-deck reader.
 *
 * WHY this exists: specs/cards/*.md is the source of truth for all 52 cards.
 * Ralph loops must not rewrite card content; a direct, explicit operator
 * request may revise it. This module turns the Markdown into typed,
 * deterministic data so deck integrity (SPEC §2–§4) can be enforced by
 * src/data/specDeck.test.ts, including the independent canon text baseline.
 *
 * Presentation-only markup in the specs (wrapping `*` or `_` around emphasis,
 * and quotes around flavor) is stripped so consumers receive the authored
 * words. Structure is preserved: each Quest bullet is a distinct step and
 * multiline proof text keeps its line breaks.
 */

import beautyRaw from "../../specs/cards/beauty.md?raw";
import connectionRaw from "../../specs/cards/connection.md?raw";
import curiosityRaw from "../../specs/cards/curiosity.md?raw";
import pleasureRaw from "../../specs/cards/pleasure.md?raw";
import wildsRaw from "../../specs/cards/wilds.md?raw";
import wonderRaw from "../../specs/cards/wonder.md?raw";

export type Territory =
  | "pleasure"
  | "curiosity"
  | "beauty"
  | "connection"
  | "wonder"
  | "wild";

export interface SpecAbility {
  name: string;
  text: string;
}

export type AbilityKind = "special" | "legendary" | "mythic";
export type RarityTag = "legendary" | "mythic";

export interface SpecCard {
  id: string; // "pleasure-01" — same collector id rule the data pass will use
  number: number; // 1..52
  title: string; // as written in the heading (uppercase)
  canon: boolean; // SPEC §4 canon anchors
  territory: Territory;
  typeLine: string; // rendered type line: "Indulgence" | "Legendary Wild" (the specs' "Invitation • " prefix is dropped)
  mode: string; // text after the "•" in the authored spec type line
  rarityTag: RarityTag | null; // wilds only, from the heading suffix
  quest: string[]; // line-separated steps
  proof: string;
  abilityKind: AbilityKind | null;
  ability?: SpecAbility;
  /** Wilds only: a Special Stretch may accompany the rarity ability. */
  stretch?: SpecAbility;
  art: string;
  flavor: string;
}

export interface SpecTerritoryMeta {
  territory: Territory;
  file: string;
  color: string;
  symbol: string;
  energy: string | null; // wilds have no energy (SPEC §2 shows "—")
  range: readonly [number, number];
}

export interface SpecDeck {
  territories: SpecTerritoryMeta[];
  cards: SpecCard[];
}

/** Spec files in canonical order; one per territory, wilds holds 51–52. */
export const SPEC_FILES: ReadonlyArray<{ file: string; territory: Territory }> = [
  { file: "pleasure", territory: "pleasure" },
  { file: "curiosity", territory: "curiosity" },
  { file: "beauty", territory: "beauty" },
  { file: "connection", territory: "connection" },
  { file: "wonder", territory: "wonder" },
  { file: "wilds", territory: "wild" },
];

const FILE_RAW: Record<string, string> = {
  pleasure: pleasureRaw,
  curiosity: curiosityRaw,
  beauty: beautyRaw,
  connection: connectionRaw,
  wonder: wonderRaw,
  wilds: wildsRaw,
};

/**
 * Territory identity per SPEC §2 — the expected header metadata every spec
 * file must agree with. Also the territories metadata the data pass will
 * export alongside DECK.
 */
export const EXPECTED_TERRITORY_META: readonly SpecTerritoryMeta[] = [
  { territory: "pleasure", file: "pleasure", color: "Crimson/Rose", symbol: "♥", energy: "Desire", range: [1, 10] },
  { territory: "curiosity", file: "curiosity", color: "Cobalt", symbol: "◉", energy: "Discovery", range: [11, 20] },
  { territory: "beauty", file: "beauty", color: "Gold", symbol: "✦", energy: "Attention", range: [21, 30] },
  { territory: "connection", file: "connection", color: "Emerald", symbol: "∞", energy: "Belonging", range: [31, 40] },
  { territory: "wonder", file: "wonder", color: "Violet", symbol: "✧", energy: "Awe", range: [41, 50] },
  { territory: "wild", file: "wilds", color: "Prismatic", symbol: "✵", energy: null, range: [51, 52] },
];

/** SPEC §4 — the seven operator-authored canon anchors. */
export interface CanonCard {
  number: number;
  title: string;
  territory: Territory;
}

export const CANON_CARDS: readonly CanonCard[] = [
  { number: 1, title: "THE RIDICULOUS DESSERT", territory: "pleasure" },
  { number: 17, title: "FOLLOW THE STRANGER'S MAP", territory: "curiosity" },
  { number: 23, title: "FLOWERS FOR NO OCCASION", territory: "beauty" },
  { number: 32, title: "THE STORY YOU NEVER ASKED FOR", territory: "connection" },
  { number: 43, title: "FOLLOW THE MUSIC", territory: "wonder" },
  { number: 51, title: "FOLLOW THE THREAD", territory: "wild" },
  { number: 52, title: "PROOF OF LIFE", territory: "wild" },
];

// Spec punctuation includes em/en dashes, middle dots, bullets, territory
// glyphs, and both straight and curly apostrophes/quotes.
const TERRITORY_HEADER_RE = /^# ([A-Z]+) — (.+?) · cards (\d+)–(\d+)\s*$/;
const CARD_HEADING_RE = /^## (\d{2})\/52 — (.+)$/;
const FIELD_RE = /^- \*\*([^*]+)\*\*: ?(.*)$/;
const ABILITY_EM_DASH_RE = /^\*\*(.+?)\*\*\s+—\s*(.*)$/;
const ABILITY_COLON_RE = /^\*\*(.+?):\*\*\s*(.*)$/;
const LIST_ITEM_RE = /^[-*+]\s+/;
const HEADING_ANY_RE = /^#{1,6}\s/;
const RULE_RE = /^---+\s*$/;

const KNOWN_FIELDS: ReadonlySet<string> = new Set([
  "Type",
  "Quest",
  "Proof of Life",
  "Special Stretch",
  "Legendary Ability",
  "Mythic Ability",
  "Art direction",
  "Flavor",
]);

const ABILITY_FIELD_KIND: Record<string, AbilityKind> = {
  "Special Stretch": "special",
  "Legendary Ability": "legendary",
  "Mythic Ability": "mythic",
};

interface Section {
  number: number;
  title: string;
  canon: boolean;
  rarityTag: RarityTag | null;
  fieldOrder: string[];
  fields: Map<string, string[]>;
}

const stripBold = (text: string): string => text.replace(/\*\*(.+?)\*\*/g, "$1");
// Flavor and ability text wrap emphasis in either asterisks or underscores.
const stripItalic = (text: string): string =>
  text.replace(/\*(.+?)\*/g, "$1").replace(/_(.+?)_/g, "$1");
const stripEmphasis = (text: string): string => stripItalic(stripBold(text));

/** Flavor lines wrap their sentence in optional asterisks and straight quotes. */
function cleanFlavor(raw: string): string {
  let text = stripEmphasis(raw.trim());
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).trim();
  }
  return text;
}

export function parseSpecFile(
  fileBase: string,
  territory: Territory,
  raw: string,
): { meta: SpecTerritoryMeta; cards: SpecCard[] } {
  const lines = raw.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => TERRITORY_HEADER_RE.test(line));
  if (headerIndex < 0) {
    throw new Error(`${fileBase}.md: no territory header line found`);
  }
  const header = lines[headerIndex]!.match(TERRITORY_HEADER_RE);
  if (!header) {
    throw new Error(`${fileBase}.md: territory header failed to parse`);
  }
  const headerName = header[1]!;
  if (headerName.toLowerCase() !== territory) {
    throw new Error(
      `${fileBase}.md: header declares territory "${headerName}", expected "${territory}"`,
    );
  }
  const parts = header[2]!.split("·").map((part) => part.trim());
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(
      `${fileBase}.md: header must be "COLOR · SYMBOL [· ENERGY] · cards NN–MM"`,
    );
  }
  const meta: SpecTerritoryMeta = {
    territory,
    file: fileBase,
    color: parts[0]!,
    symbol: parts[1]!,
    energy: parts.length === 3 ? parts[2]! : null,
    range: [Number.parseInt(header[3]!, 10), Number.parseInt(header[4]!, 10)],
  };

  const sections: Section[] = [];
  let current: Section | null = null;
  const flush = (): void => {
    if (current) {
      sections.push(current);
      current = null;
    }
  };

  for (const line of lines.slice(headerIndex + 1)) {
    const heading = line.match(CARD_HEADING_RE);
    if (heading) {
      flush();
      const number = Number.parseInt(heading[1]!, 10);
      if (Number.isNaN(number)) {
        throw new Error(`${fileBase}.md: bad card number in "${line.trim()}"`);
      }
      const segments = heading[2]!.split(" — ").map((segment) => segment.trim());
      const title = segments[0]!;
      if (title === "") {
        throw new Error(`${fileBase}.md: card ${number} has an empty title`);
      }
      let canon = false;
      let rarityTag: RarityTag | null = null;
      for (const segment of segments.slice(1)) {
        if (segment === "CANON") {
          if (canon) {
            throw new Error(`${fileBase}.md: card ${number} repeats the CANON heading marker`);
          }
          canon = true;
        } else if (segment === "LEGENDARY" || segment === "MYTHIC") {
          if (rarityTag !== null) {
            throw new Error(`${fileBase}.md: card ${number} has conflicting or repeated rarity markers`);
          }
          rarityTag = segment.toLowerCase() as RarityTag;
        } else {
          throw new Error(
            `${fileBase}.md: unexpected heading suffix "${segment}" on card ${number}`,
          );
        }
      }
      current = { number, title, canon, rarityTag, fieldOrder: [], fields: new Map() };
      continue;
    }
    if (HEADING_ANY_RE.test(line) || RULE_RE.test(line)) {
      // Any other heading or a horizontal rule closes the card section, so
      // trailing prose (e.g. wilds.md design notes) can never leak into a card.
      flush();
      continue;
    }
    if (!current) continue; // intro prose between the file header and card 01

    const field = line.match(FIELD_RE);
    if (field) {
      const name = field[1]!;
      if (!KNOWN_FIELDS.has(name)) {
        throw new Error(
          `${fileBase}.md: card ${current.number} has unknown field "**${name}**" — the anatomy is frozen, a typo here is a structural defect`,
        );
      }
      if (current.fields.has(name)) {
        throw new Error(`${fileBase}.md: card ${current.number} repeats field "**${name}**"`);
      }
      current.fieldOrder.push(name);
      current.fields.set(name, [field[2] ?? ""]);
      continue;
    }
    if (/^\s+\S/.test(line)) {
      const lastName = current.fieldOrder[current.fieldOrder.length - 1];
      if (!lastName) {
        throw new Error(
          `${fileBase}.md: card ${current.number} has an indented line before any field`,
        );
      }
      current.fields.get(lastName)!.push(line.trim().replace(LIST_ITEM_RE, ""));
      continue;
    }
    if (line.trim() === "") continue;
    throw new Error(
      `${fileBase}.md: card ${current.number} has unexpected unindented content: "${line.trim()}"`,
    );
  }
  flush();

  return { meta, cards: sections.map((section) => buildCard(territory, fileBase, section)) };
}

function buildCard(territory: Territory, fileBase: string, section: Section): SpecCard {
  const { number, title, canon, rarityTag, fieldOrder, fields } = section;

  const fieldLines = (name: string): string[] => {
    const lines = fields.get(name);
    if (!lines) {
      throw new Error(`${fileBase}.md: card ${number} is missing **${name}**`);
    }
    return lines;
  };
  const scalar = (name: string): string => stripEmphasis(fieldLines(name).join("\n")).trim();

  const rawType = scalar("Type");
  const bulletIndex = rawType.indexOf("•");
  if (bulletIndex < 0) {
    throw new Error(
      `${fileBase}.md: card ${number} type line has no "•" mode separator: "${rawType}"`,
    );
  }
  const mode = rawType.slice(bulletIndex + 1).trim();
  if (mode === "") {
    throw new Error(`${fileBase}.md: card ${number} has an empty mode`);
  }
  // Specs author the full "Invitation • Mode" line (wilds: "Legendary Invitation
  // • Wild"); the rendered type line drops the "Invitation • " prefix.
  const typeLine = rawType.replace("Invitation • ", "");

  const quest = fieldLines("Quest")
    .map((line) => stripEmphasis(line).trim())
    .filter((line) => line !== "");
  if (quest.length === 0) {
    throw new Error(`${fileBase}.md: card ${number} has an empty quest`);
  }

  const proof = scalar("Proof of Life");
  if (proof === "") throw new Error(`${fileBase}.md: card ${number} has an empty Proof of Life`);
  const art = scalar("Art direction");
  if (art === "") throw new Error(`${fileBase}.md: card ${number} has empty Art direction`);
  const flavor = cleanFlavor(fieldLines("Flavor").join("\n"));
  if (flavor === "") throw new Error(`${fileBase}.md: card ${number} has empty Flavor`);

  let ability: SpecAbility | undefined;
  let stretch: SpecAbility | undefined;
  let abilityKind: AbilityKind | null = null;
  const abilityFields = fieldOrder.filter((name) => name in ABILITY_FIELD_KIND);
  // Wilds may carry both their canon rarity ability (Legendary/Mythic Ability)
  // and a Special Stretch; the rarity ability is the signature one and the
  // stretch is carried separately. Every other card holds at most one ability
  // field, which is its Special Stretch.
  const rarityFields = abilityFields.filter((name) => name !== "Special Stretch");
  const conflicting = territory === "wild"
    ? abilityFields.length - rarityFields.length > 1 || rarityFields.length > 1
    : abilityFields.length > 1;
  if (conflicting) {
    throw new Error(`${fileBase}.md: card ${number} has more than one ability field`);
  }
  const abilityField = territory === "wild"
    ? rarityFields[0]
    : abilityFields[0];
  const stretchField = territory === "wild" ? "Special Stretch" : undefined;
  const parseAbility = (fieldName: string): SpecAbility => {
    // The ability value keeps its **Name** marker until parsed, so do not
    // strip emphasis here — the regex below needs the markers to find the
    // name; name/text are cleaned afterwards. Specs use either the older
    // "**Name** — text" or the newer "**Name:** text" form.
    const value = fieldLines(fieldName).join("\n").trim();
    const match = value.match(ABILITY_EM_DASH_RE) ?? value.match(ABILITY_COLON_RE);
    if (!match) {
      throw new Error(
        `${fileBase}.md: card ${number} has malformed ability text: "${value}"`,
      );
    }
    const parsed = { name: match[1]!.trim(), text: stripEmphasis(match[2]!).trim() };
    if (parsed.name === "" || parsed.text === "") {
      throw new Error(`${fileBase}.md: card ${number} has an empty ability name or text`);
    }
    return parsed;
  };

  if (abilityField) {
    abilityKind = ABILITY_FIELD_KIND[abilityField]!;
    ability = parseAbility(abilityField);
  }
  if (stretchField !== undefined && fieldOrder.includes(stretchField)) {
    stretch = parseAbility(stretchField);
  }

  return {
    id: `${territory}-${String(number).padStart(2, "0")}`,
    number,
    title,
    canon,
    territory,
    typeLine,
    mode,
    rarityTag,
    quest,
    proof,
    abilityKind,
    ...(ability ? { ability } : {}),
    ...(stretch ? { stretch } : {}),
    art,
    flavor,
  };
}

/** Parse raw spec file contents — pure, so tests can feed fixtures. */
export function parseSpecDeck(sources: Record<string, string>): SpecDeck {
  const territories: SpecTerritoryMeta[] = [];
  const cards: SpecCard[] = [];
  for (const { file, territory } of SPEC_FILES) {
    const source = sources[file];
    if (source === undefined) {
      throw new Error(`specs/cards/${file}.md source not provided`);
    }
    const parsed = parseSpecFile(file, territory, source);
    territories.push(parsed.meta);
    cards.push(...parsed.cards);
  }
  return { territories, cards };
}

/** Load and parse the real frozen deck from specs/cards/. */
export function loadSpecDeck(): SpecDeck {
  return parseSpecDeck(FILE_RAW);
}
