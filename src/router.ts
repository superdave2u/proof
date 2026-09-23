import { DECK } from "./data/cards";

export interface CardRoute {
  type: "card";
  cardId: string;
}

export type AppRoute = "deck" | "archive" | CardRoute;

export interface HashRouterHost {
  location: { hash: string };
  history: {
    state: unknown;
    replaceState(data: unknown, unused: string, url?: string | URL | null): void;
  };
  addEventListener(type: "hashchange", listener: () => void): void;
  removeEventListener(type: "hashchange", listener: () => void): void;
}

export interface HashRouter {
  navigate(route: AppRoute): void;
  destroy(): void;
}

const cardIds = new Set(DECK.map((card) => card.id));

function isCardId(cardId: string): boolean {
  return cardIds.has(cardId);
}

function routePath(route: AppRoute): string {
  if (route === "deck" || route === "archive") return route;
  return isCardId(route.cardId) ? `card/${route.cardId}` : "deck";
}

function routesEqual(left: AppRoute, right: AppRoute): boolean {
  if (typeof left === "string" || typeof right === "string") return left === right;
  return left.type === right.type && left.cardId === right.cardId;
}

/** Resolve supported routes while treating an empty or unknown hash as home. */
export function routeFromHash(hash: string): AppRoute {
  const route = hash.replace(/^#\/?/, "");
  if (route === "archive") return "archive";
  const cardMatch = /^card\/([a-z]+-\d{2})$/.exec(route);
  const cardId = cardMatch?.[1];
  if (cardId && isCardId(cardId)) return { type: "card", cardId };
  return "deck";
}

function isCanonicalRouteHash(hash: string, route: AppRoute): boolean {
  const path = routePath(route);
  return hash === `#/${path}` || hash === `#${path}`;
}

/** Keep the visible screen in sync with URL navigation and browser history. */
export function mountHashRouter(
  host: HashRouterHost,
  onRoute: (route: AppRoute, shouldFocus: boolean) => void,
): HashRouter {
  let currentRoute = routeFromHash(host.location.hash);
  const initialHash = host.location.hash;
  if (initialHash && !isCanonicalRouteHash(initialHash, currentRoute)) {
    host.history.replaceState(host.history.state, "", `#/${routePath(currentRoute)}`);
  }

  onRoute(currentRoute, false);

  const handleHashChange = (): void => {
    const route = routeFromHash(host.location.hash);
    if (host.location.hash && !isCanonicalRouteHash(host.location.hash, route)) {
      host.history.replaceState(host.history.state, "", `#/${routePath(route)}`);
    }
    if (routesEqual(route, currentRoute)) return;
    currentRoute = route;
    onRoute(route, true);
  };

  host.addEventListener("hashchange", handleHashChange);

  return {
    navigate(route): void {
      const normalizedRoute = routePath(route) === "deck" && route !== "deck" ? "deck" : route;
      if (!routesEqual(normalizedRoute, currentRoute)) {
        host.location.hash = `/${routePath(normalizedRoute)}`;
      }
    },
    destroy(): void {
      host.removeEventListener("hashchange", handleHashChange);
    },
  };
}
