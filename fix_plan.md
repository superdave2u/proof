# fix_plan.md

Living, priority-sorted list of incomplete work. Single source of truth for Ralph's next move.

Legend: `[ ]` incomplete · `[x]` done (verified) — prune `[x]` items periodically.

## Baseline design (DONE — operator-authored, canon)

- [x] SPEC.md — full product spec from operator vision (territories, anatomy, states, archive/weathering, philosophy, non-goals)
- [x] DESIGN.md — visual identity, card face layout, data model, screens, weathering, testing strategy
- [x] specs/cards/ seeded with 7 CANON cards (01, 17, 23, 32, 43, 51, 52); wilds.md complete

## Content phase — author remaining 45 cards (planning loops, P0)

- [ ] pleasure.md — author pending cards 02–10 (9 cards, canon style bar, no canon edits)
- [ ] curiosity.md — author pending cards 11–16, 18–20 (9 cards)
- [ ] beauty.md — author pending cards 21, 22, 24–30 (9 cards)
- [ ] connection.md — author pending cards 31, 33–40 (9 cards)
- [ ] wonder.md — author pending cards 41, 42, 44–50 (9 cards)

## Build phase (P1, after deck authoring)

- [ ] Data pipeline: `src/data/cards.ts` — transcribe all 52 specs into typed `Card[]`; assign rarity per SPEC §3 (5/3/2 per territory; wilds canon legendary/mythic)
- [ ] Schema tests: exactly 52, 10 per territory + 2 wilds, unique ids/numbers/names, anatomy completeness, canon text verbatim, no placeholder content
- [ ] Card face component: territory theming + symbols, type line, art window (CSS-composed scenes), quest/proof/ability/reward/flavor blocks, collector line, rarity gems, prismatic wilds
- [ ] Deck view: grid, card backs w/ territory glint, filters (territory, state), lived counts
- [ ] Draw ritual: deal/flip animation (reduced-motion aware), UNDISCOVERED → DRAWN
- [ ] Daily draw: date-seeded, deterministic, shown once per day
- [ ] Evidence flow: date + note + optional artifact photo (dataURL, size-capped) → LIVED; forward-only state machine in store
- [ ] Weathering: procedural Lived-card transformation (rotation, stains, tape, handwriting, bent corners) — deterministic per card id
- [ ] Archive view: the battered-deck gallery with evidence
- [ ] App shell: hash router, territory design tokens, typography, a11y (contrast, keyboard, 320px)
- [ ] README.md + production build green