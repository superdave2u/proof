import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { MAX_ARTIFACT_BYTES } from "./evidence";
import { createDeckStore, DECK_STORAGE_KEY, loadDeckRecords, type KeyValueStorage } from "./store";

class MemoryStorage implements KeyValueStorage {
  values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

/**
 * WHY these tests exist: drawing is the game's entry into its one-way lifecycle.
 * They protect random eligibility, the date-seeded daily deal (same local date,
 * same card even after reload or completion), the UNDISCOVERED → DRAWN transition,
 * durable reload behavior, the evidence-backed DRAWN → LIVED transition,
 * rejection of invalid/backward submissions, and resilience to stale or
 * malformed browser storage. Evidence persistence matters because the Archive
 * is the player's record of a life lived, not merely a visual card state.
 */
describe("deck store draw ritual", () => {
  it("draws an undiscovered adventure, timestamps it, and persists the forward transition", () => {
    const storage = new MemoryStorage();
    const store = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:30:00.000Z"));

    const card = store.draw();

    expect(card).toBe(DECK[0]);
    expect(store.getRecords()[card!.id]).toEqual({ state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" });
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!)).toEqual({
      version: 1,
      cards: { "pleasure-01": { state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" } },
    });
  });

  it("draws from all non-Lived cards without ever changing a Drawn or Lived card backwards", () => {
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards: {
        "pleasure-01": { state: "drawn", drawnAt: "2026-09-21T10:00:00.000Z" },
        "pleasure-02": { state: "lived", livedAt: "2026-09-21", evidence: { date: "2026-09-21", note: "A day lived." } },
      },
    }));
    const store = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:30:00.000Z"));

    expect(store.draw()?.id).toBe("pleasure-01");
    expect(store.getRecords()["pleasure-01"]?.drawnAt).toBe("2026-09-21T10:00:00.000Z");
    expect(store.getRecords()["pleasure-02"]?.state).toBe("lived");
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!).cards["pleasure-02"].state).toBe("lived");
  });

  /** WHY this exists: the card-detail Draw action must honor that card's identity without permitting a Lived card to move backward. */
  it("draws the addressed undiscovered card and refuses unknown or Lived cards", () => {
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards: {
        "beauty-23": { state: "lived", evidence: { date: "2026-09-21", note: "A day remembered." } },
      },
    }));
    const store = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:30:00.000Z"));

    expect(store.draw("connection-32")).toBe(DECK.find((card) => card.id === "connection-32"));
    expect(store.getRecords()["connection-32"]).toEqual({ state: "drawn", drawnAt: "2026-09-22T12:30:00.000Z" });
    expect(store.draw("unknown-01")).toBeUndefined();
    expect(store.draw("beauty-23")).toBeUndefined();
    expect(store.getRecords()["beauty-23"]?.state).toBe("lived");
  });

  it("chooses one date-seeded card, saves it, and restores the same deal after reloads", () => {
    const storage = new MemoryStorage();
    let currentTime = new Date(2026, 8, 22, 12, 30);
    let dailyCardId = "";
    const now = (): Date => currentTime;
    const store = createDeckStore(storage, () => dailyCardId === DECK[0]!.id ? 0.99 : 0, now);

    expect(store.getDailyDraw()).toBeUndefined();
    const card = store.drawDaily()!;
    dailyCardId = card.id;
    const drawnAt = store.getRecords()[card.id]?.drawnAt;
    const saved = JSON.parse(storage.getItem(DECK_STORAGE_KEY)!);

    expect(saved.dailyDraw).toEqual({ date: "2026-09-22", cardId: card.id });
    expect(store.getRecords()[card.id]).toEqual({ state: "drawn", drawnAt });
    expect(store.drawDaily()).toBe(card);
    store.draw();
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!).dailyDraw).toEqual({ date: "2026-09-22", cardId: card.id });

    currentTime = new Date(2026, 8, 22, 23, 59);
    expect(store.getDailyDraw()).toBe(card);
    expect(store.drawDaily()).toBe(card);
    expect(store.getRecords()[card.id]?.drawnAt).toBe(drawnAt);

    const reloaded = createDeckStore(storage, () => 0.99, now);
    expect(reloaded.getDailyDraw()).toBe(card);
    expect(reloaded.drawDaily()).toBe(card);

    currentTime = new Date(2026, 8, 23, 0, 1);
    expect(reloaded.getDailyDraw()).toBeUndefined();
    const nextDayCard = reloaded.drawDaily()!;
    expect(JSON.parse(storage.getItem(DECK_STORAGE_KEY)!).dailyDraw).toEqual({
      date: "2026-09-23",
      cardId: nextDayCard.id,
    });
  });

  it("uses the same date seed for independent pristine decks and ignores Lived cards", () => {
    const date = new Date(2026, 8, 22, 8);
    const first = createDeckStore(undefined, undefined, () => date).drawDaily();
    const second = createDeckStore(undefined, undefined, () => date).drawDaily();
    expect(first?.id).toBe(second?.id);

    const onlyUnlived = Object.fromEntries(
      DECK.slice(0, -1).map((card) => [card.id, {
        state: "lived" as const,
        evidence: { date: "2026-09-22", note: "A life lived." },
      }]),
    );
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({ version: 1, cards: onlyUnlived }));
    expect(createDeckStore(storage, undefined, () => date).drawDaily()).toBe(DECK[DECK.length - 1]);
  });

  it("keeps the same day's card even if that card is already Lived, but has no new deal when all are Lived", () => {
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
    expect(store.drawDaily()).toBe(DECK[0]);

    const nextDay = createDeckStore(storage, undefined, () => new Date(2026, 8, 23, 12));
    expect(nextDay.getDailyDraw()).toBeUndefined();
    expect(nextDay.drawDaily()).toBeUndefined();
  });

  it("returns no card after all adventures are Lived", () => {
    const cards = Object.fromEntries(DECK.map((card) => [card.id, {
      state: "lived" as const,
      evidence: { date: "2026-09-22", note: "A life lived." },
    }]));
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({ version: 1, cards }));
    const store = createDeckStore(storage);

    expect(store.draw()).toBeUndefined();
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

  it("rejects an invalid random source rather than selecting an arbitrary card", () => {
    const store = createDeckStore(undefined, () => 1);

    expect(() => store.draw()).toThrow(RangeError);
  });
});

describe("evidence lifecycle", () => {
  it("deposits date, note, and optional photo as a durable Lived record", () => {
    const storage = new MemoryStorage();
    const drawnAt = "2026-09-22T12:30:00.000Z";
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({
      version: 1,
      cards: { "pleasure-01": { state: "drawn", drawnAt } },
    }));
    const store = createDeckStore(storage, undefined, () => new Date("2026-09-22T14:00:00.000Z"));
    const artifact = "data:image/png;base64,AAAA";

    expect(store.submitEvidence("pleasure-01", {
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
    expect(store.draw()).not.toBe(DECK[0]);
  });

  it("accepts a note without an artifact while rejecting invalid and backward submissions", () => {
    const storage = new MemoryStorage();
    const store = createDeckStore(storage, () => 0, () => new Date("2026-09-22T12:30:00.000Z"));

    expect(store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "Not drawn yet." })).toBe(false);
    expect(store.draw()?.id).toBe("pleasure-01");
    expect(store.submitEvidence("pleasure-01", { date: "2026-02-30", note: "Impossible day." })).toBe(false);
    expect(store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "   " })).toBe(false);
    expect(store.submitEvidence("not-a-card", { date: "2026-09-22", note: "Unknown card." })).toBe(false);
    expect(store.getRecords()["pleasure-01"]?.state).toBe("drawn");

    expect(store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "A remembered afternoon." })).toBe(true);
    expect(store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "Cannot overwrite the archive." })).toBe(false);
    expect(store.getRecords()["pleasure-01"]?.evidence?.note).toBe("A remembered afternoon.");
  });

  it("rejects oversized or malformed artifact data and leaves the drawn state intact", () => {
    const store = createDeckStore(undefined, () => 0);
    store.draw();
    const oversized = `data:image/png;base64,${"A".repeat(Math.ceil(MAX_ARTIFACT_BYTES / 3) * 4 + 4)}`;

    expect(store.submitEvidence("pleasure-01", {
      date: "2026-09-22", note: "A useful note.", artifact: oversized,
    })).toBe(false);
    expect(store.submitEvidence("pleasure-01", {
      date: "2026-09-22", note: "A useful note.", artifact: "javascript:alert(1)",
    })).toBe(false);
    expect(store.getRecords()["pleasure-01"]?.state).toBe("drawn");
  });

  it("does not claim a Lived transition when storage rejects the evidence record", () => {
    const storage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => { throw new Error("quota exceeded"); },
    };
    const store = createDeckStore(storage, () => 0);
    store.draw();

    expect(store.submitEvidence("pleasure-01", { date: "2026-09-22", note: "A remembered day." })).toBe(false);
    expect(store.getRecords()["pleasure-01"]?.state).toBe("drawn");
  });
});
