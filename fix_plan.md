# fix_plan.md

Living, priority-sorted list of incomplete work. Single source of truth for Ralph's next move.

Legend: `[ ]` incomplete · `[x]` done (verified by tests) — prune `[x]` items periodically.

## Planning phase (current)

- [ ] Draft SPEC.md — product spec: purpose, deck structure (52 cards / 4 suits × 13), card anatomy, mechanics (draw, daily draw, journal, history, favorites), non-goals
- [ ] Draft DESIGN.md — screens, UX flow, data model, localStorage strategy, visual direction, file layout
- [ ] Draft specs/cards/hearts.md (13 unique cards)
- [ ] Draft specs/cards/spades.md (13 unique cards)
- [ ] Draft specs/cards/diamonds.md (13 unique cards)
- [ ] Draft specs/cards/clubs.md (13 unique cards)
- [ ] Re-plan: compare specs against codebase; rewrite this list as the prioritized build plan

## Build phase (to be prioritized after planning)

- [ ] Data pipeline: typed deck data in src/data/ + schema tests (52 cards, 13/suit, unique ids, no empty fields)
- [ ] Draw mechanics (shuffle, daily draw, spreads)
- [ ] Journaling (localStorage persistence)
- [ ] History / streaks / favorites
- [ ] App shell, visual design pass, accessibility
- [ ] Production build + README