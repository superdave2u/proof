import { describe, expect, it } from "vitest";
import { APP_TITLE, describeApp } from "./app";

/**
 * WHY this test exists: it is the wheel smoke test. It proves the Ralph
 * back-pressure pipeline (tsc --noEmit + vitest run) is wired and green from
 * the very first loop, before any feature code lands. If this fails, the
 * harness itself is broken — fix the harness, not the app.
 */
describe("wheel smoke", () => {
  it("wires the app module into the test wheel", () => {
    expect(APP_TITLE).toBe("Proof of Life");
    expect(describeApp()).toContain(APP_TITLE);
  });
});