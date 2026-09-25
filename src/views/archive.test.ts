import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { filterArchive, renderArchiveView, type ArchiveRecords } from "./archive";

/**
 * WHY these tests exist: the Archive is the player's durable record of life
 * lived, not a second deck or a progress scoreboard. It renders the same
 * preview-shaped tiles as the Gallery, newest evidence first; the date, note,
 * and artifact themselves live on the card detail page. These checks ensure
 * only complete Lived records are collected and no evidence leaks into the grid.
 */
describe("archive view", () => {
  it("collects only Lived records with evidence, newest evidence first", () => {
    const records: ArchiveRecords = {
      "pleasure-01": { state: "lived", livedAt: "2026-09-20T12:00:00Z", evidence: { date: "2026-09-20", note: "A table set for one." } },
      "beauty-23": { state: "lived", livedAt: "2026-09-22T12:00:00Z", evidence: { date: "2026-09-22", note: "A petal kept." } },
      "wonder-43": { state: "drawn", evidence: { date: "2026-09-23", note: "Not yet lived." } },
      "wild-51": { state: "lived", livedAt: "2026-09-24T12:00:00Z" },
    };

    expect(filterArchive(DECK, records).map((card) => card.id)).toEqual(["beauty-23", "pleasure-01"]);
  });

  it("shows a quiet first-entry state without completion pressure", () => {
    const html = renderArchiveView();

    expect(html).toContain("Your Archive is waiting for its first piece of evidence.");
    // Page navigation moved to the header menu.
    expect(html).not.toContain('data-action="back-to-deck"');
    expect(html).not.toContain("0 / 52");
    expect(html).not.toContain("card-tile");
    expect(html).not.toContain("deck-card-back");
  });

  it("renders each lived card as the same preview tile as the gallery, linked to its detail record", () => {
    const card = DECK.find((item) => item.id === "beauty-23")!;
    const html = renderArchiveView({
      [card.id]: {
        state: "lived",
        livedAt: "2026-09-22T12:00:00Z",
        evidence: {
          date: "2026-09-22",
          note: "Pressed <petal> & kept it.",
          artifact: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
        },
      },
    });

    expect(html).toContain('<div class="card-tile" data-card-id="beauty-23" data-state="lived">');
    expect(html).toContain("Lived · in the Archive");
    expect(html).toContain('class="card-tile__link" href="#/card/beauty-23"');
    expect(html).toContain("card-face--preview");
    expect(html).toContain("Flowers for No Occasion");
    expect(html).not.toContain("<h3>Quest</h3>");
    // The evidence record (date, note, artifact) lives on the card detail page.
    expect(html).not.toContain("Pressed");
    expect(html).not.toContain("lived-artifact");
    expect(html).not.toContain("weathering");
  });
});
