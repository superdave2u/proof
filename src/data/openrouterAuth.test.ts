import { describe, expect, it } from "vitest";
import { readOpenRouterApiKey } from "../../scripts/openrouterAuth";

/**
 * WHY these tests exist: the dedicated art loop uses the operator's existing
 * OpenRouter auth without asking them to duplicate a secret into .env or print
 * it to the console. Malformed or non-OpenRouter auth must safely mean no key.
 */
describe("OpenRouter auth key extraction", () => {
  it("reads only the saved OpenRouter key", () => {
    expect(readOpenRouterApiKey(JSON.stringify({
      openrouter: { type: "api", key: "sk-or-secret" },
      openai: { type: "api", key: "other-secret" },
    }))).toBe("sk-or-secret");
  });

  it("returns undefined for missing, empty, malformed, or unrelated auth", () => {
    for (const value of [
      undefined,
      "not-json",
      JSON.stringify({}),
      JSON.stringify({ openrouter: { type: "oauth", access: "token" } }),
      JSON.stringify({ openrouter: { key: "  " } }),
    ]) {
      expect(readOpenRouterApiKey(value)).toBeUndefined();
    }
  });
});
