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
- [x] Card face: art window removed — replaced by a territory atmosphere panel (4:3, procedural pattern within the territory's color/tonal range + sigil watermark; prismatic wild, deep-black mythic); flavor text moved inside the panel, centered vertically and horizontally in the negative space. Art direction strings stay frozen in card specs and in `Card.art` for later reintroduction.
- [x] Deck view: revealed (face-up) cards no longer show a "Drawn" state label — being face up implies it; the "Lived · in the Archive" note remains because it is not implied by the face.

## Build phase (P0 first — the deck is the product, schema is the contract)

- [x] Card detail screen: add a deep-linkable full card detail view with state-appropriate Draw and Proof of Life actions; current app only has deck and Archive routes despite DESIGN §5 specifying this flow.
- [x] Surface failed deck-storage writes for random, daily, and card-specific draws; persistence currently fails silently for draws although evidence submission correctly preserves the prior state on failure.

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

### Learnings — card face pass (loop 0.0.11)

- The renderer is `src/components/cardFace.ts`; it uses existing territory metadata for symbols, escapes all authored text, and supports clean lived evidence presentation, including card 52's required vow.
- CSS art is composed from scene motifs selected from the authored art direction, with reduced-motion foil behavior.
- Proof text preserves authored line breaks as explicit HTML breaks, important for card 52's required statements.
- Tests cover all 52 cards, wild rarity, escaping, and lived presentation.
- Validation passed: `npx tsc --noEmit && npx vitest run` (4 files, 26 tests).

### Learnings — deck view pass

- In `src/views/deck.ts`, missing records mean undiscovered; passed card records render drawn/lived cards. Filters combine territory + state, and lived count is deck-wide.
- Validation passed: `npx tsc --noEmit && npx vitest run` (5 files, 30 tests).

### Learnings — draw ritual pass

- Draws randomly select from non-Lived cards per SPEC §7, including existing Drawn cards without resetting their state; Drawn persistence is forward-only and timestamped under `proof-of-life:deck:v1`.
- The flip reveal is accessible and reduced-motion aware. Validation passed: `npx tsc --noEmit && npx vitest run` (6 files, 37 tests).

### Learnings — daily draw pass

- The store persists `{ date, cardId }` with the selected card record under the existing v1 key. The local calendar date seeds deterministic FNV-1a selection from non-Lived cards.
- A saved same-day selection survives reload and remains stable if its card later becomes Lived; the UI locks the reveal for the day and refreshes at local midnight.
- Verification passed: `npx tsc --noEmit && npx vitest run` (6 files, 41 tests).

### Learnings — evidence flow pass

- The evidence API only allows DRAWN → LIVED; it validates dates, notes, data URLs, and a 512 KiB decoded-image cap. Evidence persists and reloads from `proof-of-life:deck:v1`; a storage write failure leaves the card DRAWN.
- Verification passed: `npx tsc --noEmit && npx vitest run` (7 files, 49 tests).

### Learnings — archive view pass

- `src/views/archive.ts` filters to Lived records with evidence and sorts newest evidence dates first (card number tie-break). It reuses `renderCardFace`, keeping dates, notes, optional artifacts, escaping, wild presentations, and clean no-weathering treatment consistent.
- The archive has a first-entry empty state and accessible deck/archive navigation sharing one store, with a refresh when opened after depositing evidence.
- `src/views/archive.test.ts` documents WHY it protects archive integrity and evidence rendering.
- Validation passed: `npx tsc --noEmit && npx vitest run` (8 files, 52 tests).

### Learnings — app shell pass

- Hash routing in `src/router.ts` supports deep links and browser history, falls back canonically for invalid hashes, and transfers focus on navigation. WCAG AA territory text tokens are contrast-tested; app-shell tests cover keyboard focus, 320px layouts, and reduced motion.
- Verification passed: `npx tsc --noEmit && npx vitest run` (10 files, 57 tests).

### Learnings — card detail pass

- WHY: `#/card/<cardId>` makes a card directly reloadable/shareable; validating the route against actual deck IDs prevents invalid or stale card links from rendering as real cards.
- Direct Draw uses the store's forward-only transition, so drawing a card cannot reset an existing state. Random and daily reveal screens link to details so either draw can lead into the full card view.
- Deposit hands off to the existing evidence flow, preserving its validation and DRAWN → LIVED persistence behavior instead of duplicating it in card detail.
- Verification: `npx tsc --noEmit && npx vitest run` passed (11 files, 64 tests).

### Learnings — draw storage failure handling pass

- Draw writes are transactional and throw `DeckStorageError` after restoring in-memory state on failure. Random and daily deck panels plus card detail show escaped, focusable `role=alert` messages.
- Tests cover store rollback and visible alerts; the evidence failure test fixture now starts from a persisted Drawn record.
- Verification passed: `npx tsc --noEmit && npx vitest run` (11 files / 68 tests).

### Learnings — browser storage access failure pass

- A denied browser `localStorage` access previously returned `undefined`, silently making app writes appear successful. `browserDeckStorage` now returns a rejecting adapter when `window` exists but accessing `localStorage` throws; `createDeckStore(undefined)` remains intentionally ephemeral when there is no window.
- Failed draws roll back, and failed evidence writes leave the card Drawn.
- Verification passed: `npx tsc --noEmit && npx vitest run` (11 files, 69 tests).

### Learnings — concurrent browser-tab updates pass

- Store mutations re-read and merge persisted records inside a cross-tab exclusive transaction, using Web Locks with a localStorage lease fallback. Record merges are forward-only and preserve the first committed Lived evidence; same-day daily draws converge to the persisted choice.
- Storage events refresh mounted views while preserving evidence drafts and focus. Tests cover independent stores, distinct-card updates, same-card evidence races, and daily draw convergence.
- Verification passed: `npx tsc --noEmit && npx vitest run` (11 files, 73 tests).

### Learnings — evidence image validation pass

- WHY: data URL syntax and a claimed MIME type do not prove an artifact is a valid image. Synchronous MIME-specific signature/container checks cover PNG, JPEG, WebP, and GIF; browser image decode with nonzero dimensions is enforced at the evidence submission/store boundary.
- Regressions cover mislabeled, truncated, and corrupt payloads, plus store rejection when image decode fails.
- Verification passed: `npx tsc --noEmit && npx vitest run` (11 files, 75 tests).

### Unaddressed backlog — parallel audit (prioritized)

- [x] P1 — Merge concurrent browser-tab updates instead of persisting full snapshots: a stale tab can overwrite newer records and evidence, losing user progress.
- [x] P2 — Validate evidence image bytes/content in addition to data URL syntax and claimed MIME type: mislabeled or invalid image data can be accepted as an artifact.
- [ ] P2 — Keep evidence entry reachable when opened from card detail despite active deck filters: the filtered-out card can leave the form hidden, blocking the intended flow.
- [ ] P2 — Restore focus when canceling the evidence form: removing the focused form element strands keyboard users without a predictable focus target.
- [ ] P3 — Give evidence artifact images descriptive alt text: generic alt text does not convey the image's relevant content to screen-reader users.
- [ ] Deferred (later update) — reintroduce rendered card artwork from the authored art-direction strings, replacing or layering over the territory atmosphere panels.

- [x] Deck integrity pass: 52 cards verified — numbering 01–52 no gaps/duplicates, unique titles/ids, complete anatomy, 7 canon anchors exact, no placeholder content (durable audit: src/data/specDeck.test.ts + src/data/specDeck.ts)
- [x] Data pipeline: `src/data/cards.ts` — transcribe all 52 specs into typed `Card[]`; assign rarity per SPEC §3 (5 common / 3 uncommon / 2 rare per territory; wilds canon legendary/mythic)
- [x] Schema tests: exactly 52, 10 per territory + 2 wilds, unique ids/numbers/names, anatomy completeness, frozen card text verbatim, no placeholder content; independent canon baselines and parser validation tests
- [x] Current verification after schema audit changes: `npx tsc --noEmit && npx vitest run` passed (3 test files, 21 tests).
- [x] Card face component: territory theming + symbols (♥ ◉ ✦ ∞ ✧, ✵ wilds), type line, art window (CSS-composed scenes from art direction), quest/proof/ability/reward/flavor blocks, collector line `TERRITORY NN/52`, rarity gems, prismatic wilds
- [x] Deck view: grid, card backs w/ territory glint, filters (territory, state), lived counts
- [x] Draw ritual: deal/flip animation (reduced-motion aware), UNDISCOVERED → DRAWN
- [x] Daily draw: date-seeded, deterministic, shown once per day
- [x] Evidence flow: date + note + optional artifact photo (dataURL, size-capped) → LIVED; forward-only state machine in store. README claims deck state persists, so verify actual localStorage persistence.
- [x] Archive view: the collected-evidence gallery with Lived cards, dates, notes, artifacts — clean presentation, no weathering (operator decision)
- [x] App shell: hash router, territory design tokens, typography, a11y (contrast, keyboard, 320px, reduced motion)
