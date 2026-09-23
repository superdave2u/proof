import { describe, expect, it } from "vitest";
import { mountHashRouter, routeFromHash, type AppRoute, type HashRouterHost } from "./router";

/**
 * WHY these tests exist: route state belongs in the URL so a screen can be
 * deep-linked and browser back/forward remains useful. These checks protect
 * startup resolution, canonical fallback, focus handoff, and listener cleanup
 * without requiring a browser DOM in the unit-test environment.
 */
class MemoryHashHost implements HashRouterHost {
  readonly history = {
    state: null,
    replacements: [] as string[],
    replaceState: (_data: unknown, _unused: string, url?: string | URL | null): void => {
      if (typeof url === "string") {
        this.history.replacements.push(url);
        this.location.hash = url.slice(url.indexOf("#"));
      }
    },
  };
  readonly location: { hash: string };
  private hash: string;
  private readonly listeners = new Set<() => void>();

  constructor(hash = "") {
    this.hash = hash;
    const host = this;
    this.location = {
      get hash(): string { return host.hash; },
      set hash(value: string) { host.hash = value.startsWith("#") ? value : `#${value}`; },
    };
  }

  addEventListener(_type: "hashchange", listener: () => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "hashchange", listener: () => void): void {
    this.listeners.delete(listener);
  }

  setHash(hash: string): void {
    this.hash = hash;
    for (const listener of this.listeners) listener();
  }
}

describe("app hash router", () => {
  it("resolves only known screens and falls back to the deck", () => {
    expect(routeFromHash("#/archive")).toBe("archive");
    expect(routeFromHash("#/gallery")).toBe("gallery");
    expect(routeFromHash("#deck")).toBe("deck");
    expect(routeFromHash("#/card/pleasure-07")).toEqual({ type: "card", cardId: "pleasure-07" });
    expect(routeFromHash("")).toBe("deck");
    expect(routeFromHash("#/missing")).toBe("deck");
  });

  /** WHY this exists: card links are only meaningful for IDs in the stable territory-NN format. */
  it("rejects malformed card IDs and canonicalizes them to the deck", () => {
    for (const hash of ["#/card/pleasure-7", "#/card/pleasure-007", "#/card/other-07", "#/card/beauty-07"]) {
      expect(routeFromHash(hash)).toBe("deck");
      const host = new MemoryHashHost(hash);
      mountHashRouter(host, () => undefined);
      expect(host.location.hash).toBe("#/deck");
    }
  });

  it("opens a deep-linked screen and canonicalizes an unknown initial hash", () => {
    const host = new MemoryHashHost("#/archive");
    const opened: Array<[AppRoute, boolean]> = [];
    mountHashRouter(host, (route, shouldFocus) => opened.push([route, shouldFocus]));

    expect(opened).toEqual([["archive", false]]);

    const invalidHost = new MemoryHashHost("#/missing");
    mountHashRouter(invalidHost, () => undefined);
    expect(invalidHost.location.hash).toBe("#/deck");
    expect(invalidHost.history.replacements).toEqual(["#/deck"]);
  });

  /** WHY this exists: card URLs must survive direct loads and navigate through the same hash/history path as other screens. */
  it("opens and navigates to card routes with focus on history changes", () => {
    const host = new MemoryHashHost("#/card/curiosity-12");
    const opened: Array<[AppRoute, boolean]> = [];
    const router = mountHashRouter(host, (route, shouldFocus) => opened.push([route, shouldFocus]));

    expect(opened).toEqual([[{ type: "card", cardId: "curiosity-12" }, false]]);
    router.navigate({ type: "card", cardId: "pleasure-03" });
    expect(host.location.hash).toBe("#/card/pleasure-03");
    host.setHash("#/deck");
    host.setHash("#/card/pleasure-03");
    expect(opened).toEqual([
      [{ type: "card", cardId: "curiosity-12" }, false],
      ["deck", true],
      [{ type: "card", cardId: "pleasure-03" }, true],
    ]);
    router.destroy();
  });

  it("updates routes for navigation and browser history, focusing changed screens", () => {
    const host = new MemoryHashHost();
    const opened: Array<[AppRoute, boolean]> = [];
    const router = mountHashRouter(host, (route, shouldFocus) => opened.push([route, shouldFocus]));

    router.navigate("gallery");
    expect(host.location.hash).toBe("#/gallery");
    host.setHash("#/gallery");
    host.setHash("#/deck");
    host.setHash("#/deck");

    expect(opened).toEqual([["deck", false], ["gallery", true], ["deck", true]]);
    router.destroy();
    host.setHash("#/archive");
    expect(opened).toHaveLength(3);
  });
});
