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

## Operator-done (verified)

- [x] GitHub Pages pipeline: `.github/workflows/deploy.yml` — npm ci → wheel → build → publish dist/ on push to main/tags; Vite `base: "./"`

## Build phase (P0 first — the deck is the product, schema is the contract)

### Learnings — deck integrity pass (loop 0.0.6)

- Deck verdict: all 52 cards parse clean from specs/cards/*.md — 10 per territory + 2 wilds, numbering 01–52 with no gaps/duplicates, titles + ids globally unique, anatomy complete per SPEC §3, wilds canon (51 Legendary / 52 Mythic via type lines), 7 canon anchors present and marked.
- Rarity: specs deliberately omit territory-card rarity; the application assigns 5 common / 3 uncommon / 2 rare (AGENT.md content rules). Wilds keep canon legendary/mythic.
- `src/data/specDeck.ts` parses the frozen specs via vite `?raw` imports (no @types/node needed; vitest env is node). It strips presentation-only markup (bold/italic asterisks, flavor quote wraps) but preserves the verbatim words and line structure: quest = string[], proof may be multi-line ("\n").
- Card ids follow DESIGN.md's exact rule: `${territory}-${NN}` (e.g. "pleasure-01"), enforced by specDeck.test.ts.
- Data transcription is complete: cards are transcribed as a static typed `DECK`; `cards.test.ts` compares each field against `loadSpecDeck()` to protect wording and structure, including multiline proof.
- `Card.art` uses the authored art-direction string model, and DESIGN.md now aligns with it.
- Seven canon card bodies are independently baselined, so coordinated edits to specs and transcription are caught.
- Parser fixture tests cover malformed anatomy, headings, and ability inputs; the parser rejects multiple abilities and unexpected prose.

### Learnings — data transcription pass

- Rarity assignments use ordinal 1–5 common, 6–8 uncommon, and 9–10 rare within each territory; wilds are 51 legendary and 52 mythic.
- Check passed: `npx tsc --noEmit && npx vitest run` (3 files, 17 tests).

- [x] Deck integrity pass: 52 cards verified — numbering 01–52 no gaps/duplicates, unique titles/ids, complete anatomy, 7 canon anchors exact, no placeholder content (durable audit: src/data/specDeck.test.ts + src/data/specDeck.ts)
- [x] Data pipeline: `src/data/cards.ts` — transcribe all 52 specs into typed `Card[]`; assign rarity per SPEC §3 (5 common / 3 uncommon / 2 rare per territory; wilds canon legendary/mythic)
- [x] Schema tests: exactly 52, 10 per territory + 2 wilds, unique ids/numbers/names, anatomy completeness, frozen card text verbatim, no placeholder content; independent canon baselines and parser validation tests
- [x] Current verification after schema audit changes: `npx tsc --noEmit && npx vitest run` passed (3 test files, 21 tests).
- [ ] Card face component: territory theming + symbols (♥ ◉ ✦ ∞ ✧, ✵ wilds), type line, art window (CSS-composed scenes from art direction), quest/proof/ability/reward/flavor blocks, collector line `TERRITORY NN/52`, rarity gems, prismatic wilds
- [ ] Deck view: grid, card backs w/ territory glint, filters (territory, state), lived counts
- [ ] Draw ritual: deal/flip animation (reduced-motion aware), UNDISCOVERED → DRAWN
- [ ] Daily draw: date-seeded, deterministic, shown once per day
- [ ] Evidence flow: date + note + optional artifact photo (dataURL, size-capped) → LIVED; forward-only state machine in store
- [ ] Archive view: the collected-evidence gallery with Lived cards, dates, notes, artifacts — clean presentation, no weathering (operator decision)
- [ ] App shell: hash router, territory design tokens, typography, a11y (contrast, keyboard, 320px, reduced motion)
