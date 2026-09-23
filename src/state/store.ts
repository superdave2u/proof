import { DECK, type Card } from "../data/cards";
import type { CardFaceRecord } from "../components/cardFace";

export const DECK_STORAGE_KEY = "proof-of-life:deck:v1";

export type DeckRecords = Readonly<Record<string, CardFaceRecord | undefined>>;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface DeckStore {
  getRecords(): DeckRecords;
  draw(): Card | undefined;
}

interface PersistedDeck {
  version: 1;
  cards: Record<string, CardFaceRecord>;
}

const deckIds = new Set(DECK.map((card) => card.id));

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEvidence(value: unknown): CardFaceRecord["evidence"] | undefined {
  if (!isObject(value) || typeof value.date !== "string" || typeof value.note !== "string") return undefined;
  if (value.artifact !== undefined && typeof value.artifact !== "string") return undefined;

  return value.artifact === undefined
    ? { date: value.date, note: value.note }
    : { date: value.date, note: value.note, artifact: value.artifact };
}

function parseCardRecord(value: unknown): CardFaceRecord | undefined {
  if (!isObject(value) || (value.state !== "undiscovered" && value.state !== "drawn" && value.state !== "lived")) {
    return undefined;
  }
  if (value.drawnAt !== undefined && typeof value.drawnAt !== "string") return undefined;
  if (value.livedAt !== undefined && typeof value.livedAt !== "string") return undefined;
  if (value.evidence !== undefined && !parseEvidence(value.evidence)) return undefined;

  const record: CardFaceRecord = { state: value.state };
  if (typeof value.drawnAt === "string") record.drawnAt = value.drawnAt;
  if (typeof value.livedAt === "string") record.livedAt = value.livedAt;
  const evidence = parseEvidence(value.evidence);
  if (evidence) record.evidence = evidence;
  return record;
}

/** Read only this deck's versioned record shape; invalid data starts as a pristine deck. */
export function loadDeckRecords(storage?: KeyValueStorage): Record<string, CardFaceRecord> {
  if (!storage) return {};

  try {
    const serialized = storage.getItem(DECK_STORAGE_KEY);
    if (!serialized) return {};

    const parsed: unknown = JSON.parse(serialized);
    if (!isObject(parsed) || parsed.version !== 1 || !isObject(parsed.cards)) return {};

    const records: Record<string, CardFaceRecord> = {};
    for (const [cardId, value] of Object.entries(parsed.cards)) {
      if (!deckIds.has(cardId)) continue;
      const record = parseCardRecord(value);
      if (record) records[cardId] = record;
    }
    return records;
  } catch {
    return {};
  }
}

function saveDeckRecords(storage: KeyValueStorage | undefined, records: DeckRecords): void {
  if (!storage) return;

  try {
    const state: PersistedDeck = { version: 1, cards: {} };
    for (const [cardId, record] of Object.entries(records)) {
      if (record) state.cards[cardId] = record;
    }
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A storage denial or quota limit must not prevent the in-memory draw ritual.
  }
}

/**
 * Create the small client-side deck store. Draws follow SPEC §7: choose randomly
 * from every card not yet Lived, while an existing Drawn card remains Drawn.
 */
export function createDeckStore(
  storage?: KeyValueStorage,
  random: () => number = Math.random,
  now: () => Date = () => new Date(),
): DeckStore {
  let records = loadDeckRecords(storage);

  return {
    getRecords: () => records,
    draw: () => {
      const eligible = DECK.filter((card) => records[card.id]?.state !== "lived");
      if (eligible.length === 0) return undefined;

      const sample = random();
      if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
        throw new RangeError("The random source must return a value in [0, 1).");
      }
      const card = eligible[Math.floor(sample * eligible.length)];
      if (!card) return undefined;

      const previous = records[card.id];
      if (previous?.state !== "drawn") {
        records = {
          ...records,
          [card.id]: { state: "drawn", drawnAt: now().toISOString() },
        };
        saveDeckRecords(storage, records);
      }
      return card;
    },
  };
}

/** Access browser storage without letting privacy-mode access errors block startup. */
export function browserDeckStorage(): KeyValueStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
