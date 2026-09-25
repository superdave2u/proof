# fix_plan.md

Living, priority-sorted list of incomplete work. Single source of truth for Ralph's next move.

Legend: `[ ]` incomplete · `[x]` done (verified) — prune `[x]` items periodically.

## Next up — the only incomplete work

- [ ] **P3 — Give evidence artifact images descriptive alt text.** `renderArtifact()` in `src/components/cardFace.ts` renders `alt="Evidence artifact"` for every deposited photo. That conveys nothing; derive a description from the evidence (date/note) or mark the image decorative, and test the chosen behavior.

## Completed — evidence-form focus restore

- [x] `closeEvidence()` now moves focus after re-rendering: `evidenceCloseFocusSelector(state)` is the single source that maps a state to its primary action (`drawn` → `open-evidence`, `lived` → `open-archive`, else the focusable `.card-detail` section). `primaryActionFor` now backs both the rendered button and the close-focus target so the mapping cannot drift; unit tests pin both the mapping and the section's `tabindex="-1"` fallback.

## Completed — direct operator card-copy revision

- [x] Revised the card Quests to no more than three distinct bullets and aligned Proof with permitted Quest branches; every Proof accepts a photograph of the event or completion. Updated the typed deck transcription and canon baselines; tests enforce both requirements. Card-spec edits remain outside Ralph-loop authority and require an explicit direct operator request, including for canon.

Everything below is verified and kept as the why-record. Prune freely when it stops earning its place.

## Completed — deck & data

- [x] Deck integrity: 52 cards parse clean from `specs/cards/*.md` — 10 per territory + 2 wilds, numbering 01–52 no gaps/duplicates, unique titles/ids, complete anatomy per SPEC §3, 7 canon anchors exact, no placeholders. Durable audit: `src/data/specDeck.ts` + `specDeck.test.ts`.
- [x] `specDeck.ts` parses the frozen specs via vite `?raw` (no `@types/node`); strips presentation-only markup (bold/italic asterisks, flavor quote wraps) but preserves verbatim words and line structure (quest = `string[]`, proof may be multiline).
- [x] Card ids follow DESIGN's rule `${territory}-${NN}`; `cards.ts` holds the typed `DECK` and `cards.test.ts` compares every field against `loadSpecDeck()`, including multiline proof.
- [x] Rarity assigned in the data pass: 5 common / 3 uncommon / 2 rare per territory (ordinal 1–5/6–8/9–10); wilds 51 legendary, 52 mythic.
- [x] Parser fixture tests cover malformed anatomy/headings/ability inputs; rejects multiple abilities and unexpected prose.
- [x] Seven canon card bodies independently baselined so coordinated spec+transcription edits are caught.

## Completed — app

- [x] App shell: hash router with deep links + history, canonical fallback for unknown hashes, focus transfer on navigation; WCAG AA territory tokens contrast-tested; keyboard/320px/reduced-motion coverage.
- [x] Card face (`src/components/cardFace.ts`): territory theming + sigils, type line, atmosphere art panel, quest/proof/special-stretch/flavor blocks, collector line `TERRITORY NN/52`, rarity gems, prismatic wilds, lived overlays with no weathering. Escapes all authored text; preserves proof line breaks (card 52's vow).
- [x] Gallery (`src/views/gallery.ts`): whole deck, territory/state filters, deck-wide lived count, aligned rows. Face-up cards are compact previews; "Lived · in the Archive" stays labeled, "Drawn" is implied. Dev-only flip/hide controls (`store.revealCard`/`store.hideCard`) to exercise states without waiting a day.
- [x] Home (`src/views/home.ts`): the daily card only, in a centered column; the dealt card waits face-down and flips on tap; the daily deal is the only reveal in production. Revealed card links to detail.
- [x] Card detail (`#/card/<cardId>`): deep-linkable; validating against real deck ids prevents stale links rendering as cards; state-appropriate action; undiscovered cards stay face-down (no name/quest/flavor leak). Deposits hand off to the existing evidence flow.
- [x] Daily draw: local calendar date seeds deterministic FNV-1a selection from non-Lived cards; `{ date, cardId }` persists under `proof-of-life:deck:v1` and survives reload, stable even if its card later becomes Lived; refreshes at local midnight.
- [x] Evidence flow: only `DRAWN → LIVED`; validates dates, notes, data URLs, and a 512 KiB decoded-image cap; failed writes leave the card Drawn. Synchronous MIME-specific signature/container checks (PNG/JPEG/WebP/GIF) plus browser image decode with nonzero dimensions are enforced at the submission/store boundary.
- [x] Draws are transactional: `DeckStorageError` after restoring in-memory state on failure; visible, focusable `role=alert` messages. Denied `localStorage` access returns a rejecting adapter instead of silently succeeding.
- [x] Archive (`src/views/archive.ts`): Lived records with evidence, newest first (card-number tie-break), first-entry empty state, reuses `renderCardFace`.
- [x] Concurrent browser-tab updates: mutations re-read and merge persisted records inside a cross-tab Web Locks transaction (localStorage lease fallback); merges are forward-only and preserve the first committed Lived evidence; same-day daily draws converge. Storage events refresh mounted views while preserving drafts and focus.
- [x] Storage failure handling surfaces for random/daily/card-specific draws; `store.draw()` removed and store mutation API is forward-only.

## Completed — imagery

- [x] All 52 generated 4:3 watercolor artifacts accepted structurally (base64 PNG, 800×600, ≤512 KiB) and committed under `src/data/generated/card-images/<id>.json`; `.ralph-art.done` present. Generation ran only through the dedicated `PROMPT-ART.md` / `ralph-art.sh` loop; no paid requests in the build loop.
- [x] Canon in `specs/art/ART-DIRECTION.md` (figure bible, six territory palettes, watercolor standard, deterministic prompt recipe, lazy delivery contract); executable form `src/data/cardArt.ts` (`FIGURE_BIBLE`, `ART_PALETTES`, `buildCardArtPrompt`, `cardArtAlt`); lazy registry `src/data/cardImages.ts`; renderer `src/components/cardArt.ts` + `mountLazyCardArt`; territory atmosphere panel is the fallback.
- [x] Container drift fix: `normalizeProviderImage` (`scripts/cardImageOutput.ts`) sniffs actual bytes and transcodes any decodable raster to the 800×600 palette-PNG contract; `art:optimize` reprocesses offline.
- [x] Shared `escapeHtml` consolidated into `src/util/html.ts`.

## Operator UX passes (post-loop)

- [x] Card copy: "adventure" → "invitation"; "Special Ability" → "Special Stretch"; Reward line removed from the anatomy; SUBHEADLINE = "Each card is an invitation back to living."
- [x] Navigation moved into the header's hidden popout menu (`src/components/appMenu.ts`); home holds only the daily card.
- [x] Daily card flips on tap; the peek is deterministic; card-of-the-day copy sits below the card.
- [x] Daily reveal no longer rebuilds the card: the back and sealed front are preloaded in one stack, the container owns the idle wobble and the inner layer owns the 3D flip, so revealing flips the already-loaded card in place. The card fades in already wobbling on first paint; the hidden face stays inert (`shouldFlipInPlace`, `dailyDrawMessage`).
- [x] Layout: deck given more room; route-focus outlines gated on `:focus-visible`.

## Engineering standards (unchanged, mandatory)

Per `AGENT.md`: TDD first, DDD (domain never touches DOM/`window`/`localStorage`/`Date.now`/`Math.random` directly), SOLID, no smells/duplication/premature work, fast fixture/fake tests, no browser automation. One `fix_plan.md` item per loop. `npm run check` green before every commit.
