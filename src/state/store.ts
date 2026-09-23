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
  getDailyDraw(): Card | undefined;
  drawDaily(): Card | undefined;
  draw(): Card | undefined;
}

interface PersistedDeck {
  version: 1;
  cards: Record<string, CardFaceRecord>;
  dailyDraw?: DailyDrawRecord;
}

interface DailyDrawRecord {
  date: string;
  cardId: string;
}

const deckIds = new Set(DECK.map((card) => card.id));
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

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
  return loadDeckState(storage).records;
}

function loadDeckState(storage?: KeyValueStorage): { records: Record<string, CardFaceRecord>; dailyDraw?: DailyDrawRecord } {
  if (!storage) return { records: {} };

  try {
    const serialized = storage.getItem(DECK_STORAGE_KEY);
    if (!serialized) return { records: {} };

    const parsed: unknown = JSON.parse(serialized);
    if (!isObject(parsed) || parsed.version !== 1 || !isObject(parsed.cards)) return { records: {} };

    const records: Record<string, CardFaceRecord> = {};
    for (const [cardId, value] of Object.entries(parsed.cards)) {
      if (!deckIds.has(cardId)) continue;
      const record = parseCardRecord(value);
      if (record) records[cardId] = record;
    }

    const dailyDraw = isObject(parsed.dailyDraw)
      && typeof parsed.dailyDraw.date === "string"
      && datePattern.test(parsed.dailyDraw.date)
      && typeof parsed.dailyDraw.cardId === "string"
      && deckIds.has(parsed.dailyDraw.cardId)
      && (records[parsed.dailyDraw.cardId]?.state === "drawn" || records[parsed.dailyDraw.cardId]?.state === "lived")
      ? { date: parsed.dailyDraw.date, cardId: parsed.dailyDraw.cardId }
      : undefined;

    return dailyDraw ? { records, dailyDraw } : { records };
  } catch {
    return { records: {} };
  }
}

function saveDeckRecords(
  storage: KeyValueStorage | undefined,
  records: DeckRecords,
  dailyDraw?: DailyDrawRecord,
): void {
  if (!storage) return;

  try {
    const state: PersistedDeck = { version: 1, cards: {} };
    for (const [cardId, record] of Object.entries(records)) {
      if (record) state.cards[cardId] = record;
    }
    if (dailyDraw) state.dailyDraw = dailyDraw;
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A storage denial or quota limit must not prevent the in-memory draw ritual.
  }
}

/**
 * Create the client-side deck store. Random draws choose from every card not yet
 * Lived; the daily draw is date-seeded and persisted so today's deal cannot reroll.
 */
export function createDeckStore(
  storage?: KeyValueStorage,
  random: () => number = Math.random,
  now: () => Date = () => new Date(),
): DeckStore {
  const loadedState = loadDeckState(storage);
  let records = loadedState.records;
  let dailyDraw = loadedState.dailyDraw;

  const persist = (): void => saveDeckRecords(storage, records, dailyDraw);
  const dateFor = (date: Date): string => {
    const year = String(date.getFullYear()).padStart(4, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const cardById = (cardId: string): Card | undefined => DECK.find((card) => card.id === cardId);

  const getDailyDraw = (): Card | undefined => {
    if (!dailyDraw || dailyDraw.date !== dateFor(now())) return undefined;
    return cardById(dailyDraw.cardId);
  };

  const drawDaily = (): Card | undefined => {
    const drawnAt = now();
    const today = dateFor(drawnAt);
    if (dailyDraw?.date === today) return cardById(dailyDraw.cardId);

    const eligible = DECK.filter((card) => records[card.id]?.state !== "lived");
    if (eligible.length === 0) return undefined;

    // FNV-1a makes the same calendar date and eligible deck produce the same deal.
    let hash = 0x811c9dc5;
    for (let index = 0; index < today.length; index += 1) {
      hash ^= today.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    const card = eligible[(hash >>> 0) % eligible.length];
    if (!card) return undefined;

    const previous = records[card.id];
    if (previous?.state !== "drawn") {
      records = { ...records, [card.id]: { state: "drawn", drawnAt: drawnAt.toISOString() } };
    }
    dailyDraw = { date: today, cardId: card.id };
    persist();
    return card;
  };

  return {
    getRecords: () => records,
    getDailyDraw,
    drawDaily,
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
        persist();
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
