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
 * They protect random eligibility, the UNDISCOVERED → DRAWN transition, durable
 * reload behavior, and resilience to stale or malformed browser storage.
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
