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
    expect(styles).toMatch(/\.card-art__caption \{[^}]*color: var\(--territory-text\);/s);
    expect(styles).toMatch(/\.card-art \{[^}]*width: 100%;/s);
    expect(styles).toMatch(/\.card-art \{[^}]*aspect-ratio: 4 \/ 3;/s);
    // WHY: the artwork is lazy (image starts transparent, src-less) and the
    // flavor caption sits over a black transparent mask between text and image.
    expect(styles).toMatch(/\.card-art__image \{[^}]*opacity: 0;/s);
    expect(styles).toMatch(/\.card-art--loaded \.card-art__image \{ opacity: 1; \}/);
    expect(styles).toMatch(/\.card-art__mask \{[^}]*linear-gradient\(to top, rgb\(0 0 0 \/ 82%\)/s);
    // WHY: the flavor window must fill the card body (not shrink to its capped
    // height); the home daily hero is a full-height stage whose card scales to
    // the leftover height (cqh) with the hint/title/message bottom-aligned; and
    // gallery/archive rows align.
    expect(styles).toMatch(/\.app-shell:has\(> #home-view:not\(\[hidden\]\)\) \{[^}]*min-height: 100dvh;/s);
    expect(styles).toMatch(/\.daily-draw__stage \{[^}]*container-type: size;/s);
    // The card must fit the leftover height (minus a margin), not a fixed cap,
    // so it scales up into the stage instead of sitting centered and small.
    // 100cqh is used on the stage's descendants, where it resolves correctly.
    expect(styles).toMatch(/\.daily-draw__card \{[^}]*width: min\(/s);
    expect(styles).toMatch(/100cqh - 2 \* var\(--daily-card-margin\)/);
    expect(styles).toMatch(/\.daily-draw__tap-card \.deck-card-back \{ max-width: none; \}/);
    // The dealt card keeps the back's 3:4 silhouette, so flipping never resizes
    // it and the page never scrolls.
    expect(styles).toMatch(/\.daily-draw__card \{[^}]*aspect-ratio: 3 \/ 4;/s);
    expect(styles).toMatch(/\.daily-draw__side--front \.card-face \{ width: 100%; max-width: none; height: 100%; \}/);
    // WHY: the dealt invitation is sealed — the text under the artwork is
    // censored behind tonal bars and a button over the bars opens the detail
    // page, so the card fits the stage without scrolling.
    expect(styles).toMatch(/\.card-face--sealed \.card-art \{[^}]*max-height: none;/s);
    expect(styles).toMatch(/\.card-face__reveal \{[^}]*position: absolute;/s);
    // WHY: the dealt card keeps the deal's idle motion after it is revealed.
    // The wobble and the entrance fade sit on the card container, and the flip
    // is an inner layer, so revealing swaps the preloaded faces without tearing
    // down the bob; the card fades in already wobbling on first paint.
    expect(styles).toMatch(/\.daily-draw__card \{[^}]*animation: card-enter [^;]*both, invite-bob 3\.6s ease-in-out infinite;/s);
    expect(styles).toMatch(/\.daily-draw__card \{[^}]*perspective:/s);
    expect(styles).toMatch(/\.daily-draw__flip \{[^}]*transform-style: preserve-3d;/s);
    expect(styles).toMatch(/\.daily-draw__flip \{[^}]*transition: transform/s);
    expect(styles).toMatch(/\.daily-draw__side \{[^}]*backface-visibility: hidden;/s);
    expect(styles).toMatch(/\.daily-draw__side--front \{ transform: rotateY\(180deg\); \}/);
    expect(styles).toMatch(/\.daily-draw__card\.is-revealed \.daily-draw__flip \{ transform: rotateY\(180deg\); \}/);
    expect(styles).toMatch(/@keyframes card-enter/);
    expect(styles).toMatch(/\.card-face--sealed::after \{[^}]*animation: invite-glint/s);
    expect(styles).toMatch(/\.daily-draw__bottom \{[^}]*flex: 0 0 auto;/s);
    // WHY: the sealed daily face has the same 3:4 silhouette as the back and
    // scales to fit, so neither the stage nor the page needs to scroll.
    expect(styles).toMatch(/\.daily-draw__stage \{[^}]*overflow: hidden;/s);
    expect(styles).toMatch(/\.deck-grid \{[^}]*align-items: stretch;/s);
    // Cards fill their track width (height-driven aspect ratio must not widen them).
    expect(styles).toMatch(/\.deck-card-back \{[^}]*width: 100%;/s);
    expect(styles).toMatch(/\.deck-card-back \{[^}]*height: 100%;/s);
    expect(styles).toMatch(/\.archive-grid \{[^}]*align-items: stretch;/s);
    // WHY: Gallery and Archive share one tile component, so both grids render
    // the same centered card face for every state.
    expect(styles).toMatch(/\.card-tile \.card-face \{ margin-inline: auto; \}/);
  });

  it("preserves visible keyboard focus, narrow-screen layout, and reduced-motion overrides", () => {
    expect(styles).toContain(":focus-visible");
    // WHY: route transitions programmatically focus the view headings and the
    // card-detail container. A bare :focus outline paints a gold ring after a
    // pointer-click navigation until the user clicks elsewhere (reported on
    // desktop and mobile), so every focus outline must be gated on
    // :focus-visible — pointer navigation stays clean, keyboard focus stays visible.
    expect(styles).not.toMatch(/:focus(?![-\w])/);
    expect(styles).toContain("body {\n  min-width: 320px;");
    expect(styles).toContain("@media (max-width: 360px)");
    // WHY: the gallery must be a single column on phones, not two cards wide.
    expect(styles).toMatch(/@media \(max-width: 520px\) \{[^@]*\.deck-grid \{ grid-template-columns: minmax\(0, 1fr\);/s);
    // WHY: on phones the gallery and Archive show one card per row. Hidden backs
    // must sit centered at the revealed face's width and be inset from every
    // edge, otherwise a face-down card hugs the screen edge and shifts on reveal.
    expect(styles).toMatch(/@media \(max-width: 520px\) \{[^@]*\.archive-grid \{ grid-template-columns: minmax\(0, 1fr\);[^}]*justify-items: center;[^}]*\}/s);
    expect(styles).toMatch(/@media \(max-width: 520px\) \{[^@]*\.deck-grid \{[^}]*padding: 1rem clamp\(/s);
    expect(styles).toMatch(/\.deck-grid > \*, \.archive-grid > \* \{ width: 100%; max-width: 22rem; margin-inline: auto; \}/);
    // WHY: the menu is a plain text control anchored to the header's right edge on
// every page — opposite the left-aligned sub-page title, never on top of it —
// and its popout opens beneath that same edge.
    expect(styles).toMatch(/\.app-menu \{ position: absolute; top: -\.25rem; right: 0; \}/);
    expect(styles).toMatch(/\.app-menu__toggle \{[^}]*border: 0; background: none;/s);
    expect(styles).toMatch(/\.app-menu__popout \{[^}]*right: 0;/s);
    // WHY: sub pages keep a compact header row (title left, menu right) with a
    // small title and a slim top inset, so the least significant element takes
    // minimal vertical space and content starts higher. The tagline and
    // subheadline are home-only.
    expect(styles).toMatch(/\.app-shell:has\(> #home-view\[hidden\]\) \{ padding-top: clamp\(1rem, 3vh, 1\.75rem\); \}/);
    expect(styles).toMatch(/\.app-shell:has\(> #home-view\[hidden\]\) \.app-intro \{ max-width: none; margin-bottom: \.75rem; text-align: left; \}/);
    expect(styles).toMatch(/\.app-shell:has\(> #home-view\[hidden\]\) \.app-intro h1 \{ margin: 0; font-size: clamp\(1\.15rem, 4vw, 1\.5rem\); \}/);
    expect(styles).toMatch(/\.app-shell:has\(> #home-view\[hidden\]\) \.app-menu \{ top: \.15rem; \}/);
    expect(styles).toMatch(/\.app-shell:has\(> #home-view\[hidden\]\) \.app-menu__toggle \{ min-height: 1\.8rem; padding: \.25rem 0; font-size: \.68rem; \}/);
    expect(styles).toMatch(/\.app-shell:has\(> #home-view\[hidden\]\) \.app-intro__eyebrow \{ display: none; \}/);
    expect(styles).toMatch(/\.app-shell:has\(> #home-view\[hidden\]\) \.app-intro__copy \{ display: none; \}/);
    // WHY: home is the pure daily ritual — no page navigation there; the menu
    // lives on sub pages only.
    expect(styles).toMatch(/\.app-shell:has\(> #home-view:not\(\[hidden\]\)\) \.app-menu \{ display: none; \}/);
    // WHY: the view's own top margin, not the header, was the biggest gap on
    // sub pages — gallery, Archive, and card detail hug the compact header now.
    expect(styles).toMatch(/\.deck-view \{ margin-top: clamp\(1rem, 3vw, 2rem\); \}/);
    expect(styles).toMatch(/\.archive-view \{ margin-top: clamp\(1rem, 3vw, 2rem\); \}/);
    expect(styles).toMatch(/\.card-detail \{ margin: clamp\(1rem, 3vw, 2rem\) auto 0; \}/);
    // WHY: card detail dropped its "Return to the deck" nav entirely — page
    // navigation now belongs to the header menu, so the detail page leads with
    // the card and only the state actions remain.
    expect(styles).not.toContain("card-detail__navigation");
    // WHY: the Gallery link next to Save Proof is an outline in the card's
    // territory tone, so it remains secondary to the primary action.
    expect(styles).toMatch(/\.card-detail__gallery \{[^}]*background: transparent;[^}]*color: color-mix\(in srgb, var\(--gallery-territory\), white 38%\);/s);
    for (const territory of ["pleasure", "curiosity", "beauty", "connection", "wonder", "wild"]) {
      expect(styles).toContain(`.card-detail__gallery--${territory} { --gallery-territory: var(--${territory}); }`);
    }
    expect(styles).toMatch(/\.card-detail__actions \{[^}]*gap: \.75rem;/s);
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation-duration: .01ms !important");
    expect(styles).toContain("transition-duration: .01ms !important");
    // The idle bob and entrance fade are silenced entirely so the reduced-motion
    // card is simply visible, never stuck at the entrance's starting opacity.
    expect(styles).toMatch(/\.draw-reveal__face, \.daily-draw__card \{ animation: none; \}/);
  });
});
