import { DECK, type Card } from "../data/cards";
import type { CardFaceRecord } from "../components/cardFace";
import { isDecodableArtifactDataUrl, isValidEvidence, type ArtifactImageDecoder, type Evidence } from "./evidence";

export const DECK_STORAGE_KEY = "proof-of-life:deck:v1";

export type DeckRecords = Readonly<Record<string, CardFaceRecord | undefined>>;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  /** Serialize read/merge/write transactions across tabs when the platform supports it. */
  runExclusive?<T>(operation: () => T | Promise<T>): Promise<T>;
  /** Notify this store when another browsing context changes the persisted deck. */
  subscribe?(listener: (value: string | null) => void): () => void;
}

export interface DeckStore {
  getRecords(): DeckRecords;
  getDailyDraw(): Card | undefined;
  drawDaily(): Promise<Card | undefined>;
  /** Development-only: reveal one card directly, outside the once-per-day deal. */
  revealCard(cardId: string): Promise<boolean>;
  /** Development-only: revert a manually revealed card to undiscovered. Lived stays terminal. */
  hideCard(cardId: string): Promise<boolean>;
  /** The deterministic deal for today, without drawing it — the home screen shows this card face-down before the tap. */
  peekDailyDraw(): Card | undefined;
  submitEvidence(cardId: string, evidence: Evidence): Promise<boolean>;
  subscribe(listener: () => void): () => void;
}

/** A requested draw could not be made durable in browser storage. */
export class DeckStorageError extends Error {
  constructor() {
    super("This draw could not be saved in this browser. Your deck is unchanged; check that browser storage is available and has space, then try again.");
    this.name = "DeckStorageError";
  }
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

function parseCardRecord(value: unknown): CardFaceRecord | undefined {
  if (!isObject(value) || (value.state !== "undiscovered" && value.state !== "drawn" && value.state !== "lived")) {
    return undefined;
  }
  if (value.drawnAt !== undefined && typeof value.drawnAt !== "string") return undefined;
  if (value.livedAt !== undefined && typeof value.livedAt !== "string") return undefined;
  if (value.state === "lived" && !isValidEvidence(value.evidence)) return undefined;
  if (value.state !== "lived" && value.evidence !== undefined) return undefined;

  const record: CardFaceRecord = { state: value.state };
  if (typeof value.drawnAt === "string") record.drawnAt = value.drawnAt;
  if (typeof value.livedAt === "string") record.livedAt = value.livedAt;
  if (value.state === "lived") record.evidence = value.evidence as Evidence;
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

function mergeRecord(left: CardFaceRecord | undefined, right: CardFaceRecord | undefined): CardFaceRecord | undefined {
  if (!left) return right;
  if (!right) return left;
  if (left.state === "lived") return left;
  if (right.state === "lived") return right;
  if (left.state === "drawn") return left;
  return right;
}

function mergeDeckStates(
  left: { records: Record<string, CardFaceRecord>; dailyDraw?: DailyDrawRecord },
  right: { records: Record<string, CardFaceRecord>; dailyDraw?: DailyDrawRecord },
): { records: Record<string, CardFaceRecord>; dailyDraw?: DailyDrawRecord } {
  const records: Record<string, CardFaceRecord> = {};
  for (const card of DECK) {
    const record = mergeRecord(left.records[card.id], right.records[card.id]);
    if (record) records[card.id] = record;
  }

  // A saved choice wins same-day races; after records merge it remains valid even
  // if another tab has since deposited that card in the Archive.
  const dailyDraw = left.dailyDraw && right.dailyDraw
    ? (left.dailyDraw.date > right.dailyDraw.date ? left.dailyDraw
      : right.dailyDraw.date > left.dailyDraw.date ? right.dailyDraw
      : right.dailyDraw)
    : left.dailyDraw ?? right.dailyDraw;
  return dailyDraw ? { records, dailyDraw } : { records };
}

function serializeDeckState(
  records: DeckRecords,
  dailyDraw?: DailyDrawRecord,
): string {
  const state: PersistedDeck = { version: 1, cards: {} };
  for (const [cardId, record] of Object.entries(records)) {
    if (record) state.cards[cardId] = record;
  }
  if (dailyDraw) state.dailyDraw = dailyDraw;
  return JSON.stringify(state);
}

function saveDeckRecords(
  storage: KeyValueStorage | undefined,
  records: DeckRecords,
  dailyDraw?: DailyDrawRecord,
): boolean {
  if (!storage) return true;

  try {
    storage.setItem(DECK_STORAGE_KEY, serializeDeckState(records, dailyDraw));
    return true;
  } catch {
    // Callers decide whether to roll back or report a failed durable transition.
    return false;
  }
}

/**
 * Create the client-side deck store. The date-seeded daily deal is the only
 * way a card becomes Drawn; it is persisted so today's deal cannot reroll.
 */
export function createDeckStore(
  storage?: KeyValueStorage,
  now: () => Date = () => new Date(),
  decodeArtifact?: ArtifactImageDecoder,
): DeckStore {
  const loadedState = loadDeckState(storage);
  let records = loadedState.records;
  let dailyDraw = loadedState.dailyDraw;
  const listeners = new Set<() => void>();
  const currentState = (): { records: Record<string, CardFaceRecord>; dailyDraw?: DailyDrawRecord } => ({
    records,
    ...(dailyDraw ? { dailyDraw } : {}),
  });

  const updateFromSerialized = (serialized: string | null): void => {
    if (!serialized) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      return;
    }
    if (!isObject(parsed) || parsed.version !== 1 || !isObject(parsed.cards)) return;
    const incoming = loadDeckState({ getItem: () => serialized, setItem: () => undefined });
    const merged = mergeDeckStates(currentState(), incoming);
    if (JSON.stringify(merged) === JSON.stringify({ records, ...(dailyDraw ? { dailyDraw } : {}) })) return;
    records = merged.records;
    dailyDraw = merged.dailyDraw;
    listeners.forEach((listener) => listener());
  };

  storage?.subscribe?.(updateFromSerialized);

  const transact = async <T>(operation: () => T): Promise<T> => {
    const execute = (): T => {
      const previous = currentState();
      const stored = loadDeckState(storage);
      const merged = mergeDeckStates(currentState(), stored);
      records = merged.records;
      dailyDraw = merged.dailyDraw;
      if (JSON.stringify(previous) !== JSON.stringify({ records, ...(dailyDraw ? { dailyDraw } : {}) })) notify();
      return operation();
    };
    return storage?.runExclusive ? storage.runExclusive(execute) : execute();
  };

  const notify = (): void => listeners.forEach((listener) => listener());

  const persist = (): boolean => saveDeckRecords(storage, records, dailyDraw);
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

  const peekDailyDraw = (): Card | undefined => {
    const today = dateFor(now());
    if (dailyDraw?.date === today) return cardById(dailyDraw.cardId);
    return deterministicDeal(today, records);
  };

  /**
 * FNV-1a makes the same calendar date and eligible deck produce the same deal,
 * whether it is peeked at face-down or actually drawn.
 */
function deterministicDeal(today: string, records: DeckRecords): Card | undefined {
  const eligible = DECK.filter((card) => records[card.id]?.state !== "lived");
  if (eligible.length === 0) return undefined;

  let hash = 0x811c9dc5;
  for (let index = 0; index < today.length; index += 1) {
    hash ^= today.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return eligible[(hash >>> 0) % eligible.length];
}

const drawDaily = (): Promise<Card | undefined> => transact(() => {
    const drawnAt = now();
    const today = dateFor(drawnAt);
    if (dailyDraw?.date === today) return cardById(dailyDraw.cardId);

    const card = deterministicDeal(today, records);
    if (!card) return undefined;

    const previousRecords = records;
    const previousDailyDraw = dailyDraw;
    if (records[card.id]?.state !== "drawn") {
      records = { ...records, [card.id]: { state: "drawn", drawnAt: drawnAt.toISOString() } };
    }
    dailyDraw = { date: today, cardId: card.id };
    if (!persist()) {
      records = previousRecords;
      dailyDraw = previousDailyDraw;
      throw new DeckStorageError();
    }
    // A concurrent same-day deal may already have won. Reconcile and return the
    // persisted choice so every participating tab reveals the same invitation.
    const saved = loadDeckState(storage);
    const merged = mergeDeckStates(currentState(), saved);
    records = merged.records;
    dailyDraw = merged.dailyDraw;
    if (JSON.stringify(previousRecords) !== JSON.stringify(records) || previousDailyDraw !== dailyDraw) notify();
    return dailyDraw?.date === today ? cardById(dailyDraw.cardId) : card;
  });

  const revealCard = (cardId: string): Promise<boolean> => transact(() => {
    if (!deckIds.has(cardId)) return false;
    const state = records[cardId]?.state;
    if (state === "lived") return false;
    if (state === "drawn") return true;

    const previousRecords = records;
    records = { ...records, [cardId]: { state: "drawn", drawnAt: now().toISOString() } };
    if (!persist()) {
      records = previousRecords;
      return false;
    }
    // Another tab may have committed a deal or evidence meanwhile; converge on it.
    const saved = loadDeckState(storage);
    const merged = mergeDeckStates(currentState(), saved);
    records = merged.records;
    dailyDraw = merged.dailyDraw;
    notify();
    return records[cardId]?.state === "drawn" || records[cardId]?.state === "lived";
  });

  const hideCard = (cardId: string): Promise<boolean> => transact(() => {
    if (!deckIds.has(cardId) || records[cardId]?.state !== "drawn") return false;

    const previousRecords = records;
    const previousDailyDraw = dailyDraw;
    const nextRecords = { ...records };
    delete nextRecords[cardId];
    records = nextRecords;
    // Clearing the deal lets the same calendar date deal again after a dev hide.
    if (dailyDraw?.cardId === cardId) dailyDraw = undefined;
    if (!persist()) {
      records = previousRecords;
      dailyDraw = previousDailyDraw;
      return false;
    }
    // Another tab may have committed a deal or evidence meanwhile; converge on it.
    const saved = loadDeckState(storage);
    const merged = mergeDeckStates(currentState(), saved);
    records = merged.records;
    dailyDraw = merged.dailyDraw;
    notify();
    return records[cardId]?.state !== "drawn";
  });

  return {
    getRecords: () => records,
    getDailyDraw,
    drawDaily,
    revealCard,
    hideCard,
    peekDailyDraw,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    submitEvidence: async (cardId, evidence) => {
      if (!deckIds.has(cardId) || records[cardId]?.state !== "drawn" || !isValidEvidence(evidence)) return false;
      if (evidence.artifact !== undefined && !await isDecodableArtifactDataUrl(evidence.artifact, decodeArtifact)) return false;

      return transact(() => {
        if (records[cardId]?.state !== "drawn") return false;

        const previousRecords = records;
        records = {
          ...records,
          [cardId]: {
            state: "lived",
            ...(previousRecords[cardId]?.drawnAt ? { drawnAt: previousRecords[cardId].drawnAt } : {}),
            livedAt: now().toISOString(),
            evidence: evidence.artifact === undefined
              ? { date: evidence.date, note: evidence.note.trim() }
              : { date: evidence.date, note: evidence.note.trim(), artifact: evidence.artifact },
          },
        };
        if (!persist()) {
          records = previousRecords;
          return false;
        }
        const saved = loadDeckState(storage);
        const merged = mergeDeckStates(currentState(), saved);
        records = merged.records;
        dailyDraw = merged.dailyDraw;
        notify();
        return records[cardId]?.state === "lived";
      });
    },
  };
}

/** Access browser storage without letting privacy-mode access errors block startup. */
export function browserDeckStorage(): KeyValueStorage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const localStorage = window.localStorage;
    const runWithStorageLease = async <T>(operation: () => T | Promise<T>): Promise<T> => {
      const lockKey = `${DECK_STORAGE_KEY}:lock`;
      const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const leaseDuration = 30_000;
      const readLease = (): string | null => {
        try {
          return localStorage.getItem(lockKey);
        } catch {
          throw new DeckStorageError();
        }
      };
      const writeLease = (value: string): void => {
        try {
          localStorage.setItem(lockKey, value);
        } catch {
          throw new DeckStorageError();
        }
      };

      while (true) {
        const current = readLease();
        let expiresAt = 0;
        if (current) {
          try {
            const lease: unknown = JSON.parse(current);
            if (isObject(lease) && typeof lease.expiresAt === "number") expiresAt = lease.expiresAt;
          } catch {
            // Replace a malformed abandoned lease.
          }
        }
        if (!current || expiresAt <= Date.now()) {
          writeLease(JSON.stringify({ owner, expiresAt: Date.now() + leaseDuration }));
          // Let simultaneous contenders' synchronous localStorage writes settle
          // before trusting the lease owner on browsers without Web Locks.
          await new Promise((resolve) => window.setTimeout(resolve, 12));
          const confirmed = readLease();
          let ownsLease = false;
          try {
            const lease: unknown = confirmed ? JSON.parse(confirmed) : undefined;
            ownsLease = isObject(lease) && lease.owner === owner;
          } catch {
            ownsLease = false;
          }
          if (ownsLease) {
            try {
              return await operation();
            } finally {
              try {
                const latest: unknown = JSON.parse(localStorage.getItem(lockKey) ?? "null");
                if (isObject(latest) && latest.owner === owner) localStorage.removeItem(lockKey);
              } catch {
                // The deck write has completed; a stale lease expires on its own.
              }
            }
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 8 + Math.random() * 17));
      }
    };
    return {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      runExclusive: async <T>(operation: () => T | Promise<T>): Promise<T> => {
        const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
        return locks
          ? locks.request(DECK_STORAGE_KEY, operation)
          : runWithStorageLease(operation);
      },
      subscribe: (listener) => {
        const handleStorage = (event: StorageEvent): void => {
          if (event.key === DECK_STORAGE_KEY && event.storageArea === localStorage) listener(event.newValue);
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
      },
    };
  } catch (error) {
    const storageError = error instanceof Error ? error : new Error("Browser storage is unavailable.");
    return {
      getItem: () => { throw storageError; },
      setItem: () => { throw storageError; },
    };
  }
}
