export type AppRoute = "deck" | "archive";

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

/** Resolve supported routes while treating an empty or unknown hash as home. */
export function routeFromHash(hash: string): AppRoute {
  const route = hash.replace(/^#\/?/, "");
  return route === "archive" ? "archive" : "deck";
}

function isCanonicalRouteHash(hash: string, route: AppRoute): boolean {
  return hash === `#/${route}` || hash === `#${route}`;
}

/** Keep the visible screen in sync with URL navigation and browser history. */
export function mountHashRouter(
  host: HashRouterHost,
  onRoute: (route: AppRoute, shouldFocus: boolean) => void,
): HashRouter {
  let currentRoute = routeFromHash(host.location.hash);
  const initialHash = host.location.hash;
  if (initialHash && !isCanonicalRouteHash(initialHash, currentRoute)) {
    host.history.replaceState(host.history.state, "", `#/${currentRoute}`);
  }

  onRoute(currentRoute, false);

  const handleHashChange = (): void => {
    const route = routeFromHash(host.location.hash);
    if (host.location.hash && !isCanonicalRouteHash(host.location.hash, route)) {
      host.history.replaceState(host.history.state, "", `#/${route}`);
    }
    if (route === currentRoute) return;
    currentRoute = route;
    onRoute(route, true);
  };

  host.addEventListener("hashchange", handleHashChange);

  return {
    navigate(route): void {
      if (route !== currentRoute) host.location.hash = `/${route}`;
    },
    destroy(): void {
      host.removeEventListener("hashchange", handleHashChange);
    },
  };
}
