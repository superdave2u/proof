import { describe, expect, it } from "vitest";

const nodeFsModule: string = "node:fs";
const { readFileSync } = await import(nodeFsModule) as {
  readFileSync(path: URL, encoding: "utf8"): string;
};
const styles = readFileSync(new URL("./style.css", import.meta.url), "utf8");

function relativeLuminance(hex: string): number {
  const channels = hex.match(/[\da-f]{2}/gi)?.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  if (!channels || channels.length !== 3) throw new Error(`Expected a six-digit hex color, got ${hex}`);
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/**
 * WHY these tests exist: the shell is the only way into the deck and Archive,
 * so its visual tokens must stay legible and mobile/motion preferences must not
 * regress as the stylesheet evolves. Contrast is checked against the darkest
 * card surface; structural assertions preserve the keyboard and 320px support.
 */
describe("app shell accessibility foundations", () => {
  it("keeps territory-accent text at WCAG AA contrast on every dark card surface", () => {
    const tokens = [...styles.matchAll(/--territory-text-(pleasure|curiosity|beauty|connection|wonder|wild):\s*(#[\da-f]{6})/gi)];
    expect(tokens.map(([, name]) => name?.toLowerCase()).sort()).toEqual([
      "beauty", "connection", "curiosity", "pleasure", "wild", "wonder",
    ]);
    for (const [, territory, color] of tokens) {
      for (const background of ["#08080b", "#242329"]) {
        expect(contrastRatio(color!, background), `${territory} text contrast on ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(styles).toContain(".card-section h3, .card-ability h3 {");
    expect(styles).toMatch(/\.card-section h3, \.card-ability h3 \{[^}]*color: var\(--territory-text\);/s);
    expect(styles).toMatch(/\.card-atmosphere__flavor \{[^}]*color: var\(--territory-text\);/s);
    expect(styles).toMatch(/\.card-atmosphere \{[^}]*aspect-ratio: 4 \/ 3;/s);
  });

  it("preserves visible keyboard focus, narrow-screen layout, and reduced-motion overrides", () => {
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("body {\n  min-width: 320px;");
    expect(styles).toContain("@media (max-width: 360px)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation-duration: .01ms !important");
    expect(styles).toContain("transition-duration: .01ms !important");
  });
});
