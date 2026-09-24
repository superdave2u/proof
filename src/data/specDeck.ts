/**
 * specDeck.ts — the frozen-deck reader.
 *
 * WHY this exists: specs/cards/*.md is frozen operator content and the single
 * source of truth for all 52 cards. Build loops must transcribe it, never
 * rewrite it. This module turns those markdown files into typed, deterministic
 * data so deck integrity (SPEC §2–§4) can be enforced mechanically by
 * src/data/specDeck.test.ts: if anyone edits a frozen card, the wheel goes red.
 *
 * Presentation-only markup in the specs (wrapping `*` on flavor lines, inline
 * `**bold**`/`*italic*` emphasis, quotes around flavor) is stripped so
 * consumers receive the verbatim WORDS. Structure is preserved: quests and
 * multi-line proofs keep their line breaks.
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

// Byte-verified punctuation in the specs: em dash (—), middle dot (·),
// en dash in ranges (–), bullet (•), straight apostrophes/quotes.
const TERRITORY_HEADER_RE = /^# ([A-Z]+) — (.+?) · cards (\d+)–(\d+)\s*$/;
const CARD_HEADING_RE = /^## (\d{2})\/52 — (.+)$/;
const FIELD_RE = /^- \*\*([^*]+)\*\*: ?(.*)$/;
const ABILITY_VALUE_RE = /^\*\*(.+?)\*\*\s+—\s*(.*)$/;
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
const stripItalic = (text: string): string => text.replace(/\*(.+?)\*/g, "$1");
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
      current.fields.get(lastName)!.push(line.trim());
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
  let abilityKind: AbilityKind | null = null;
  const abilityFields = fieldOrder.filter((name) => name in ABILITY_FIELD_KIND);
  if (abilityFields.length > 1) {
    throw new Error(`${fileBase}.md: card ${number} has more than one ability field`);
  }
  const abilityField = abilityFields[0];
  if (abilityField) {
    abilityKind = ABILITY_FIELD_KIND[abilityField]!;
    // The ability value keeps its **Name** marker until parsed, so do not
    // strip emphasis here — the regex below needs the markers to find the
    // name; name/text are cleaned afterwards.
    const value = fieldLines(abilityField).join("\n").trim();
    const match = value.match(ABILITY_VALUE_RE);
    if (!match) {
      throw new Error(
        `${fileBase}.md: card ${number} has malformed ability text: "${value}"`,
      );
    }
    ability = {
      name: match[1]!.trim(),
      text: stripEmphasis(match[2]!).trim(),
    };
    if (ability.name === "" || ability.text === "") {
      throw new Error(`${fileBase}.md: card ${number} has an empty ability name or text`);
    }
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
