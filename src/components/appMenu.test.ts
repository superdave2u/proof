import { describe, expect, it } from "vitest";
import { renderAppMenu } from "./appMenu";

/**
 * WHY this test exists: page navigation moved out of per-view buttons into one
 * always-available header popout, so every screen keeps its whitespace. This
 * pins the popout's accessibility contract: the toggle advertises its state,
 * the popout is hidden until opened, and the three deck routes are reachable
 * through plain hash links the router already understands.
 */
describe("app header menu", () => {
  it("renders a hidden popout behind an accessible toggle", () => {
    const html = renderAppMenu();

    expect(html).toContain('class="app-menu__toggle"');
    expect(html).toContain('data-action="toggle-menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="app-menu-popout"');
    expect(html).toContain('<nav id="app-menu-popout" class="app-menu__popout" hidden');
    expect(html).toContain('href="#/deck"');
    expect(html).toContain('href="#/gallery"');
    expect(html).toContain('href="#/archive"');
    expect(html).toContain("Today");
    expect(html).toContain("Gallery");
    expect(html).toContain("Archive");
  });
});