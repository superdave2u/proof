export function readOpenRouterApiKey(serializedAuth: string | undefined): string | undefined {
  if (!serializedAuth) return undefined;
  try {
    const auth = JSON.parse(serializedAuth) as Record<string, unknown>;
    const provider = auth.openrouter;
    if (typeof provider !== "object" || provider === null || Array.isArray(provider)) return undefined;
    const key = (provider as Record<string, unknown>).key;
    return typeof key === "string" && key.trim() ? key.trim() : undefined;
  } catch {
    return undefined;
  }
}
