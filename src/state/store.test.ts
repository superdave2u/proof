import { describe, expect, it, vi } from "vitest";
import { DECK } from "../data/cards";
import { MAX_ARTIFACT_BYTES } from "./evidence";
import { browserDeckStorage, createDeckStore, DeckStorageError, DECK_STORAGE_KEY, loadDeckRecords, type KeyValueStorage } from "./store";

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();
  private listeners = new Set<(value: string | null) => void>();
  private pendingTransaction: Promise<void> = Promise.resolve();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
    if (key === DECK_STORAGE_KEY) this.listeners.forEach((listener) => listener(value));
  }

  subscribe(listener: (value: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  runExclusive<T>(operation: () => T | Promise<T>): Promise<T> {
    const result = this.pendingTransaction.then(operation, operation);
    this.pendingTransaction = result.then(() => undefined, () => undefined);
    return result;
  }
}

/**
 * WHY these tests exist: drawing is the game's entry into its one-way lifecycle.
 * They protect random eligibility, the date-seeded daily deal (same local date,
 * same card even after reload or completion), the UNDISCOVERED → DRAWN transition,
 * durable reload behavior, the evidence-backed DRAWN → LIVED transition,
 * rejection of invalid/backward submissions, and resilience to stale or
 * malformed browser storage. Failed draw writes must roll back too, so the app
 * never presents a non-durable deal as a successful state transition. Evidence
 * persistence matters because the Archive is the player's record of a life
 * lived, not merely a visual card state.
 */
describe("deck store draw ritual", () => {
  /** WHY: independently opened tabs hold stale snapshots. This verifies that serialized mutations re-read and merge the latest deck, and that live notifications keep each tab current instead of allowing a later snapshot to erase another adventure or its evidence. */
  it("merges concurrent tab updates and propagates committed records to each store", async () => {
    const storage = new MemoryStorage();
    const firstTab = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:00:00.000Z"));
    const secondTab = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:30:00.000Z"));
    const secondTabChanges = vi.fn();
    secondTab.subscribe(secondTabChanges);

    await Promise.all([
      firstTab.draw("pleasure-01"),
      secondTab.draw("connection-32"),
    ]);

    expect(firstTab.getRecords()["pleasure-01"]?.state).toBe("drawn");
    expect(secondTab.getRecords()["pleasure-01"]?.state).toBe("drawn");
    expect(firstTab.getRecords()["connection-32"]?.state).toBe("drawn");
    expect(secondTab.getRecords()["connection-32"]?.state).toBe("drawn");
    expect(secondTabChanges).toHaveBeenCalled();

    expect(await firstTab.submitEvidence("pleasure-01", {
      date: "2026-09-22", note: "The receipt from the evening.",
    })).toBe(true);
    await secondTab.draw("beauty-23");

    const persisted = JSON.parse(storage.getItem(DECK_STORAGE_KEY)!);
    expect(persisted.cards["pleasure-01"].evidence.note).toBe("The receipt from the evening.");
    expect(persisted.cards["connection-32"].state).toBe("drawn");
    expect(persisted.cards["beauty-23"].state).toBe("drawn");
    expect(secondTab.getRecords()["pleasure-01"]?.state).toBe("lived");
  });

  /** WHY: when two stale tabs try to archive the same Drawn card, only the first durable Lived transition may win; a later submission must not replace the physical evidence already kept in the Archive. */
  it("does not let stale same-card submissions replace evidence already lived", async () => {
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards: { "pleasure-01": { state: "drawn", drawnAt: "2026-09-22T10:00:00.000Z" } },
    }));
    const firstTab = createDeckStore(storage);
    const secondTab = createDeckStore(storage);

    const outcomes = await Promise.all([
      firstTab.submitEvidence("pleasure-01", { date: "2026-09-22", note: "First evidence." }),
      secondTab.submitEvidence("pleasure-01", { date: "2026-09-22", note: "Competing evidence." }),
    ]);

    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!).cards["pleasure-01"].evidence.note).toBe("First evidence.");
    expect(firstTab.getRecords()["pleasure-01"]?.state).toBe("lived");
    expect(secondTab.getRecords()["pleasure-01"]?.state).toBe("lived");
  });

  /** WHY: the same day's deal is one shared calendar event. Concurrent tabs must converge on the first persisted daily selection rather than showing different adventures. */
  it("converges concurrent daily draws on one persisted card for the date", async () => {
    const storage = new MemoryStorage();
    const date = () => new Date("2026-09-22T12:00:00.000Z");
    const firstTab = createDeckStore(storage, () => 0, date);
    const secondTab = createDeckStore(storage, () => 0.75, date);

    const [first, second] = await Promise.all([firstTab.drawDaily(), secondTab.drawDaily()]);

    expect(first?.id).toBe(second?.id);
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!).dailyDraw.cardId).toBe(first?.id);
    expect(secondTab.getDailyDraw()?.id).toBe(first?.id);
  });

  /** WHY: denied browser storage must not be mistaken for intentional ephemeral storage, which would let a draw appear successful without being durable. */
  it("fails closed when accessing browser storage is denied, while no-window callers remain ephemeral", async () => {
    const accessError = new Error("storage access denied");
    vi.stubGlobal("window", Object.defineProperty({}, "localStorage", {
      configurable: true,
      get: () => { throw accessError; },
    }));

    try {
      const storage = browserDeckStorage();
      expect(storage).toBeDefined();
      expect(() => storage!.getItem(DECK_STORAGE_KEY)).toThrow(accessError);
      expect(() => storage!.setItem(DECK_STORAGE_KEY, "{}")).toThrow(accessError);

      const randomStore = createDeckStore(storage, () => 0);
      const specificStore = createDeckStore(storage, () => 0);
      const dailyStore = createDeckStore(storage, undefined, () => new Date("2026-09-22T12:00:00.000Z"));
      await expect(randomStore.draw()).rejects.toThrow(DeckStorageError);
      await expect(specificStore.draw("pleasure-01")).rejects.toThrow(DeckStorageError);
      await expect(dailyStore.drawDaily()).rejects.toThrow(DeckStorageError);
      expect(randomStore.getRecords()).toEqual({});
      expect(specificStore.getRecords()).toEqual({});
      expect(dailyStore.getRecords()).toEqual({});
      expect(dailyStore.getDailyDraw()).toBeUndefined();

      vi.stubGlobal("window", undefined);
      expect(browserDeckStorage()).toBeUndefined();
      await expect(createDeckStore(undefined, () => 0).draw()).resolves.toBe(DECK[0]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("draws an undiscovered adventure, timestamps it, and persists the forward transition", async () => {
    const storage = new MemoryStorage();
    const store = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:30:00.000Z"));

    const card = await store.draw();

    expect(card).toBe(DECK[0]);
    expect(store.getRecords()[card!.id]).toEqual({ state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" });
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!)).toEqual({
      version: 1,
      cards: { "pleasure-01": { state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" } },
    });
  });

  it("draws from all non-Lived cards without ever changing a Drawn or Lived card backwards", async () => {
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards: {
        "pleasure-01": { state: "drawn", drawnAt: "2026-09-21T10:00:00.000Z" },
        "pleasure-02": { state: "lived", livedAt: "2026-09-21", evidence: { date: "2026-09-21", note: "A day lived." } },
      },
    }));
    const store = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:30:00.000Z"));

    expect((await store.draw())?.id).toBe("pleasure-01");
    expect(store.getRecords()["pleasure-01"]?.drawnAt).toBe("2026-09-21T10:00:00.000Z");
    expect(store.getRecords()["pleasure-02"]?.state).toBe("lived");
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!).cards["pleasure-02"].state).toBe("lived");
  });

  /** WHY this exists: the card-detail Draw action must honor that card's identity without permitting a Lived card to move backward. */
  it("draws the addressed undiscovered card and refuses unknown or Lived cards", async () => {
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards: {
        "beauty-23": { state: "lived", evidence: { date: "2026-09-21", note: "A day remembered." } },
      },
    }));
    const store = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:30:00.000Z"));

    expect(await store.draw("connection-32")).toBe(DECK.find((card) => card.id === "connection-32"));
    expect(store.getRecords()["connection-32"]).toEqual({ state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" });
    expect(await store.draw("unknown-01")).toBeUndefined();
    expect(await store.draw("beauty-23")).toBeUndefined();
    expect(store.getRecords()["beauty-23"]?.state).toBe("lived");
  });

  it("reports and rolls back failed random and card-specific draw writes", async () => {
    const storage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => { throw new Error("quota exceeded"); },
    };
    const randomStore = createDeckStore(storage, () => 0);
    const specificStore = createDeckStore(storage, () => 0);

    await expect(randomStore.draw()).rejects.toThrow(DeckStorageError);
    expect(randomStore.getRecords()).toEqual({});
    await expect(specificStore.draw("connection-32")).rejects.toThrow(DeckStorageError);
    expect(specificStore.getRecords()).toEqual({});
  });

  it("reports a failed daily deal without retaining its card or date in memory", async () => {
    const storage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => { throw new Error("quota exceeded"); },
    };
    const date = new Date(2026, 8, 22, 12);
    const store = createDeckStore(storage, undefined, () => date);

    await expect(store.drawDaily()).rejects.toThrow(DeckStorageError);
    expect(store.getRecords()).toEqual({});
    expect(store.getDailyDraw()).toBeUndefined();
  });

  it("chooses one date-seeded card, saves it, and restores the same deal after reloads", async () => {
    const storage = new MemoryStorage();
    let currentTime = new Date(2026, 8, 22, 12, 30);
    let dailyCardId = "";
    const now = (): Date => currentTime;
    const store = createDeckStore(storage, () => dailyCardId === DECK[0]!.id ? 0.99 : 0, now);

    expect(store.getDailyDraw()).toBeUndefined();
    const card = (await store.drawDaily())!;
    dailyCardId = card.id;
    const drawnAt = store.getRecords()[card.id]?.drawnAt;
    const saved = JSON.parse(storage.getItem(DECK_STORAGE_KEY)!);

    expect(saved.dailyDraw).toEqual({ date: "2026-09-22", cardId: card.id });
    expect(store.getRecords()[card.id]).toEqual({ state: "drawn", drawnAt });
    expect(await store.drawDaily()).toBe(card);
    await store.draw();
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!).dailyDraw).toEqual({ date: "2026-09-22", cardId: card.id });

    currentTime = new Date(2026, 8, 22, 23, 59);
    expect(store.getDailyDraw()).toBe(card);
    expect(await store.drawDaily()).toBe(card);
    expect(store.getRecords()[card.id]?.drawnAt).toBe(drawnAt);

    const reloaded = createDeckStore(storage, () => 0.99, now);
    expect(reloaded.getDailyDraw()).toBe(card);
    expect(await reloaded.drawDaily()).toBe(card);

    currentTime = new Date(2026, 8, 23, 0, 1);
    expect(reloaded.getDailyDraw()).toBeUndefined();
    const nextDayCard = (await reloaded.drawDaily())!;
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!).dailyDraw).toEqual({
      date: "2026-09-23",
      cardId: nextDayCard.id,
    });
  });

  it("uses the same date seed for independent pristine decks and ignores Lived cards", async () => {
    const date = new Date(2026, 8, 22, 8);
    const first = await createDeckStore(undefined, undefined, () => date).drawDaily();
    const second = await createDeckStore(undefined, undefined, () => date).drawDaily();
    expect(first?.id).toBe(second?.id);

    const onlyUnlived = Object.fromEntries(
      DECK.slice(0, -1).map((card) => [card.id, {
        state: "lived" as const,
        evidence: { date: "2026-09-22", note: "A life lived." },
      }]),
    );
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({ version: 1, cards: onlyUnlived }));
    expect(await createDeckStore(storage, undefined, () => date).drawDaily()).toBe(DECK[DECK.length - 1]);
  });

  it("keeps the same day's card even if that card is already Lived, but has no new deal when all are Lived", async () => {
    const date = new Date(2026, 8, 22, 12);
    const cards = Object.fromEntries(DECK.map((card) => [card.id, {
      state: "lived" as const,
      evidence: { date: "2026-09-22", note: "A life lived." },
    }]));
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards,
      dailyDraw: { date: "2026-09-22", cardId: DECK[0]!.id },
    }));
    const store = createDeckStore(storage, undefined, () => date);

    expect(store.getDailyDraw()).toBe(DECK[0]);
    expect(await store.drawDaily()).toBe(DECK[0]);

    const nextDay = createDeckStore(storage, undefined, () => new Date(2026, 8, 23, 12));
    expect(nextDay.getDailyDraw()).toBeUndefined();
    expect(await nextDay.drawDaily()).toBeUndefined();
  });

  it("returns no card after all adventures are Lived", async () => {
    const cards = Object.fromEntries(DECK.map((card) => [card.id, {
      state: "lived" as const,
      evidence: { date: "2026-09-22", note: "A life lived." },
    }]));
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({ version: 1, cards }));
    const store = createDeckStore(storage);

    expect(await store.draw()).toBeUndefined();
  });

  it("loads only valid records belonging to this exact 52-card deck", () => {
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards: {
        "pleasure-01": { state: "drawn", drawnAt: "yesterday" },
        "pleasure-02": { state: "lived", evidence: { date: "2026-09-21", note: "Remembered." } },
        "not-a-card": { state: "drawn" },
        "beauty-23": { state: "lived", evidence: { date: 3, note: "invalid" } },
      },
    }));

    expect(loadDeckRecords(storage)).toEqual({
      "pleasure-01": { state: "drawn", drawnAt: "yesterday" },
      "pleasure-02": { state: "lived", evidence: { date: "2026-09-21", note: "Remembered." } },
    });

    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards: {
        "pleasure-01": { state: "lived", evidence: { date: "2026-09-22", note: "Over the photo limit.", artifact: `data:image/png;base64,${"A".repeat(700_000)}` } },
        "pleasure-02": { state: "lived" },
      },
    }));
    expect(loadDeckRecords(storage)).toEqual({});
  });

  it("treats malformed, incompatible, and unavailable storage as an undiscovered deck", () => {
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, "{");
    expect(loadDeckRecords(storage)).toEqual({});

    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({ version: 2, cards: { "pleasure-01": { state: "lived" } } }));
    expect(loadDeckRecords(storage)).toEqual({});
    expect(loadDeckRecords()).toEqual({});
  });

  it("rejects an invalid random source rather than selecting an arbitrary card", async () => {
    const store = createDeckStore(undefined, () => 1);

    await expect(store.draw()).rejects.toThrow(RangeError);
  });
});

describe("evidence lifecycle", () => {
  it("deposits date, note, and optional photo as a durable Lived record", async () => {
    const storage = new MemoryStorage();
    const drawnAt = "2026-09-22T12:30:00.000Z";
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards: { "pleasure-01": { state: "drawn", drawnAt } },
    }));
    const store = createDeckStore(
      storage,
      undefined,
      () => new Date("2026-09-22T14:00:00.000Z"),
      async () => ({ width: 1, height: 1 }),
    );
    const artifact = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";

    expect(await store.submitEvidence("pleasure-01", {
      date: "2026-09-21",
      note: "A walk beneath the last warm light.",
      artifact,
    })).toBe(true);
    const expected = {
      state: "lived",
      drawnAt,
      livedAt: "2026-09-22T14:00:00.000Z",
      evidence: { date: "2026-09-21", note: "A walk beneath the last warm light.", artifact },
    };
    expect(store.getRecords()["pleasure-01"]).toEqual(expected);
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!).cards["pleasure-01"]).toEqual(expected);
    expect(createDeckStore(storage).getRecords()["pleasure-01"]).toEqual(expected);
    expect(await store.draw()).not.toBe(DECK[0]);
  });

  it("accepts a note without an artifact while rejecting invalid and backward submissions", async () => {
    const storage = new MemoryStorage();
    const store = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:30:00.000Z"));

    expect(await store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "Not drawn yet." })).toBe(false);
    expect((await store.draw())?.id).toBe("pleasure-01");
    expect(await store.submitEvidence("pleasure-01", { date: "2026-02-30", note: "Impossible day." })).toBe(false);
    expect(await store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "   " })).toBe(false);
    expect(await store.submitEvidence("not-a-card", { date: "2026-09-22", note: "Unknown card." })).toBe(false);
    expect(store.getRecords()["pleasure-01"]?.state).toBe("drawn");

    expect(await store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "A remembered afternoon." })).toBe(true);
    expect(await store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "Cannot overwrite the archive." })).toBe(false);
    expect(store.getRecords()["pleasure-01"]?.evidence?.note).toBe("A remembered afternoon.");
  });

  it("rejects oversized or malformed artifact data and leaves the drawn state intact", async () => {
    const store = createDeckStore(undefined, () => 0);
    await store.draw();
    const oversized = `data:image/png;base64,${"A".repeat(Math.ceil(MAX_ARTIFACT_BYTES / 3) * 4 + 4)}`;

    expect(await store.submitEvidence("pleasure-01", {
      date: "2026-09-22", note: "A useful note.", artifact: oversized,
    })).toBe(false);
    expect(await store.submitEvidence("pleasure-01", {
      date: "2026-09-22", note: "A useful note.", artifact: "javascript:alert(1)",
    })).toBe(false);
    expect(await store.submitEvidence("pleasure-01", {
      date: "2026-09-22", note: "Mislabeled bytes.", artifact: "data:image/png;base64,AAAA",
    })).toBe(false);
    expect(store.getRecords()["pleasure-01"]?.state).toBe("drawn");
  });

  /** WHY: valid container headers alone cannot prove compressed pixels decode. The store must reject a broken image decoder result too, so callers cannot bypass upload validation and create an unrenderable Archive artifact. */
  it("rejects an image that has valid container bytes but cannot be decoded", async () => {
    const store = createDeckStore(undefined, () => 0, undefined, async () => undefined);
    await store.draw();

    expect(await store.submitEvidence("pleasure-01", {
      date: "2026-09-22",
      note: "A corrupted image file.",
      artifact: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
    })).toBe(false);
    expect(store.getRecords()["pleasure-01"]?.state).toBe("drawn");
  });

  /** WHY: even after a card is drawn, inaccessible or full storage must reject its evidence and leave the card Drawn instead of presenting an unpersisted Archive entry. */
  it("does not claim a Lived transition when storage rejects the evidence record", async () => {
    const storage: KeyValueStorage = {
      getItem: () => JSON.stringify({
        version: 1,
        cards: { "pleasure-01": { state: "drawn", drawnAt: "2026-09-22T12:00:00.000Z" } },
      }),
      setItem: () => { throw new Error("quota exceeded"); },
    };
    const store = createDeckStore(storage, () => 0);

    expect(await store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "A remembered day." })).toBe(false);
    expect(store.getRecords()["pleasure-01"]?.state).toBe("drawn");
  });
});
