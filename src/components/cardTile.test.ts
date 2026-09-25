import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { renderCardTile } from "./cardTile";

const card = DECK.find((item) => item.id === "pleasure-01")!;

/**
 * WHY these tests exist: the Gallery and the Archive must render the same
 * preview-shaped tile for every state of progress, so a card never changes
 * silhouette as it is dealt. These assertions pin the concealed shape of an
 * undiscovered tile (no name/mode/flavor leak), the detail link on revealed
 * tiles, the lived label, and the development-only flip/hide controls.
 */
describe("card tile", () => {
  it("shapes an undiscovered card like the revealed preview but withholds its content", () => {
    const html = renderCardTile(card);

    expect(html).toContain('class="card-tile card-tile--undiscovered" data-card-id="pleasure-01" data-state="undiscovered"');
    expect(html).toContain("card-face--concealed");
    expect(html).toContain("card-face--preview");
    expect(html).toContain("Pleasure");
    // The state label sits where the flavor caption would, not in the title.
    expect(html).toMatch(/card-art__caption">Undiscovered</);
    // Leaving hollow title/mode containers behind would gap the layout.
    expect(html).not.toContain("card-face__name");
    expect(html).not.toContain("card-face__type");
    expect(html).not.toContain(card.name);
    expect(html).not.toContain("card-tile__link");
    expect(html).not.toContain("<h3>Quest</h3>");
  });

  it("renders revealed cards as preview links and labels only Lived", () => {
    const drawn = renderCardTile(card, { record: { state: "drawn" } });
    expect(drawn).toContain('class="card-tile" data-card-id="pleasure-01" data-state="drawn"');
    expect(drawn).toContain('class="card-tile__link" href="#/card/pleasure-01"');
    expect(drawn).toContain("card-face--preview");
    expect(drawn).not.toContain("<h3>Quest</h3>");
    expect(drawn).not.toContain("Lived · in the Archive");

    // Evidence lives on the card detail page, not on the grid tile.
    const lived = renderCardTile(card, { record: { state: "lived", evidence: { date: "2026-09-22", note: "A quiet kept thing." } } });
    expect(lived).toContain("Lived · in the Archive");
    expect(lived).not.toContain("A quiet kept thing.");
    // The label sits below the card so Lived tiles still align with Drawn ones.
    expect(lived.indexOf("card-tile__link")).toBeLessThan(lived.indexOf("Lived · in the Archive"));
  });

  it("adds a manual flip only for undiscovered cards and a hide control only while Drawn", () => {
    expect(renderCardTile(card, { devMode: true })).toContain('data-action="flip-card"');
    expect(renderCardTile(card)).not.toContain('data-action="flip-card"');
    expect(renderCardTile(card, { record: { state: "drawn" }, devMode: true })).toContain('data-action="hide-card"');
    expect(renderCardTile(card, { record: { state: "drawn" } })).not.toContain('data-action="hide-card"');
    expect(renderCardTile(card, { record: { state: "lived", evidence: { date: "2026-09-22", note: "Lived." } }, devMode: true }))
      .not.toContain('data-action="hide-card"');
  });
});
