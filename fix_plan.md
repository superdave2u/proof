# fix_plan.md

Living, priority-sorted list of incomplete work. Single source of truth for Ralph's next move.

Legend: `[ ]` incomplete · `[x]` done (verified) — prune `[x]` items periodically.

## Deck content (DONE — operator-seeded, frozen)

- [x] SPEC.md / DESIGN.md — product + technical baseline (canon)
- [x] specs/cards/pleasure.md — 10 cards (01 canon; 02–10 authored)
- [x] specs/cards/curiosity.md — 10 cards (17 canon; 11–16, 18–20 authored)
- [x] specs/cards/beauty.md — 10 cards (23 canon; 21, 22, 24–30 authored)
- [x] specs/cards/connection.md — 10 cards (32 canon; 31, 33–40 authored)
- [x] specs/cards/wonder.md — 10 cards (43 canon; 41, 42, 44–50 authored)
- [x] specs/cards/wilds.md — 51 Follow the Thread (Legendary), 52 Proof of Life (Mythic) — canon, complete

## Build phase (P0 first — the deck is the product, schema is the contract)

- [ ] Deck integrity pass (planning loop): verify 52 cards, numbering 01–52 no gaps/duplicates, unique titles, anatomy complete
- [ ] Data pipeline: `src/data/cards.ts` — transcribe all 52 specs into typed `Card[]`; assign rarity per SPEC §3 (5 common / 3 uncommon / 2 rare per territory; wilds canon legendary/mythic)
- [ ] Schema tests: exactly 52, 10 per territory + 2 wilds, unique ids/numbers/names, anatomy completeness, frozen card text verbatim, no placeholder content
- [ ] Card face component: territory theming + symbols (♥ ◉ ✦ ∞ ✧, ✵ wilds), type line, art window (CSS-composed scenes from art direction), quest/proof/ability/reward/flavor blocks, collector line `TERRITORY NN/52`, rarity gems, prismatic wilds
- [ ] Deck view: grid, card backs w/ territory glint, filters (territory, state), lived counts
- [ ] Draw ritual: deal/flip animation (reduced-motion aware), UNDISCOVERED → DRAWN
- [ ] Daily draw: date-seeded, deterministic, shown once per day
- [ ] Evidence flow: date + note + optional artifact photo (dataURL, size-capped) → LIVED; forward-only state machine in store
- [ ] Archive view: the collected-evidence gallery with Lived cards, dates, notes, artifacts — clean presentation, no weathering (operator decision)
- [ ] App shell: hash router, territory design tokens, typography, a11y (contrast, keyboard, 320px, reduced motion)
- [ ] Production build green