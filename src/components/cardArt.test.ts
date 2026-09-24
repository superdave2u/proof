import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { renderCardArt } from "./cardArt";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/**
 * WHY these tests exist: the art panel is the only place the flavor text now
 * appears on a rendered card. These assertions pin the lazy contract (no eager
 * src), the black caption mask, the accessible alt handoff, and the escaping of
 * authored flavor so the caption can never become an injection point.
 */
describe("renderCardArt", () => {
  it("renders a src-less lazy image with a masked flavor caption", () => {
    const card = DECK[0]!;
    const html = renderCardArt(card);

    expect(html).toContain(`class="card-art card-art--${card.territory}"`);
    expect(html).toContain(`data-card-art="${card.id}"`);
    expect(html).toContain(`data-art-image="${card.id}"`);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).not.toContain("src=");
    expect(html).toContain("card-art__mask");
    expect(html).toContain("card-art__caption");
    expect(html).toContain(`“${escapeHtml(card.flavor)}”`);
    expect(html).toContain("card-art__sigil");
  });

  it("carries the art direction as the lazily applied alt description", () => {
    const card = DECK[0]!;
    const html = renderCardArt(card);

    expect(html).toContain(`data-art-alt="Watercolor illustration for ${escapeHtml(card.name)}:`);
    expect(html).toMatch(/<img[^>]* alt=""/);
  });

  it("escapes authored flavor and identifiers", () => {
    const card = {
      ...DECK[0]!,
      id: 'card"><script>alert(1)</script>',
      flavor: 'A quiet <evening> & "good" cake.',
    };
    const html = renderCardArt(card);

    expect(html).toContain("A quiet &lt;evening&gt; &amp; &quot;good&quot; cake.");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain('data-art-image="card&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
  });
});
