import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
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
 * durable reload behavior, and resilience to stale or malformed browser storage.
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
      DECK.slice(0, -1).map((card) => [card.id, { state: "lived" as const }]),
    );
    const storage = new MemoryStorage();
    storage.setItem(DECK_STORAGE_KEY, JSON.stringify({ version: 1, cards: onlyUnlived }));
    expect(createDeckStore(storage, undefined, () => date).drawDaily()).toBe(DECK[DECK.length - 1]);
  });

  it("keeps the same day's card even if that card is already Lived, but has no new deal when all are Lived", () => {
    const date = new Date(2026, 8, 22, 12);
    const cards = Object.fromEntries(DECK.map((card) => [card.id, { state: "lived" as const }]));
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
    const cards = Object.fromEntries(DECK.map((card) => [card.id, { state: "lived" as const }]));
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
        "pleasure-02": { state: "lived", evidence: { date: "today", note: "Remembered." } },
        "not-a-card": { state: "drawn" },
        "beauty-23": { state: "lived", evidence: { date: 3, note: "invalid" } },
      },
    }));

    expect(loadDeckRecords(storage)).toEqual({
      "pleasure-01": { state: "drawn", drawnAt: "yesterday" },
      "pleasure-02": { state: "lived", evidence: { date: "today", note: "Remembered." } },
    });
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
