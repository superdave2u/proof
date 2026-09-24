/**
 * True only while running the Vite dev server (`npm run dev`) or when the app is
 * served from localhost. The daily deal is the game's only reveal in production;
 * local development gets a manual flip so card states can be exercised without
 * waiting a day.
 */
export function isLocalDevelopment(): boolean {
  if (typeof import.meta.env !== "undefined" && import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;

  const hostname = window.location?.hostname ?? "";
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname.endsWith(".localhost");
}
