import { describe, expect, it } from "vitest";
import { DECK } from "../data/cards";
import { filterArchive, renderArchiveView, type ArchiveRecords } from "./archive";

/**
 * WHY these tests exist: the Archive is the player's durable record of life
 * lived, not a second deck or a progress scoreboard. These checks ensure only
 * complete Lived evidence is collected, the newest evidence is easy to find,
 * and dates, notes, and optional artifacts remain visible and safely rendered.
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
    expect(html).not.toContain("deck-card-back");
  });

  it("renders each lived card with escaped evidence, date, and its optional artifact", () => {
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

    expect(html).toContain('<div class="archive-entry" data-card-id="beauty-23">');
    expect(html).toContain("2026-09-22");
    expect(html).toContain("Pressed &lt;petal&gt; &amp; kept it.");
    expect(html).toContain('<img class="lived-artifact" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=="');
    expect(html).toContain("Flowers for No Occasion");
    expect(html).not.toContain("weathering");
  });
});
