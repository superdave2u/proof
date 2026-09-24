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

- [x] Layout pass: atmosphere panel fills the card body (width 100%); home daily card centered in a column like detail; gallery/archive rows stretch so cards align per row; random "Draw an adventure" removed everywhere (daily flip is the only reveal); deep-linked undiscovered cards render face-down with no content leak; store.draw() removed.

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

### Learnings — imagery pass

- Canon: `specs/art/ART-DIRECTION.md` fixes the recurring heroine (the Wayfarer), six territory tonal palettes, loose watercolor technique (bleeding washes, dissolved contours, unfinished edges; no crisp graphic-novel outlines), the deterministic prompt recipe, and the lazy base64-PNG delivery contract. SPEC §3.1 + acceptance criteria 7–8 record the product requirement.
- Domain: `src/data/cardArt.ts` is the canon as pure data (`FIGURE_BIBLE`, `ART_PALETTES`, `buildCardArtPrompt`, `cardArtAlt`); `src/data/cardImages.ts` is the lazy registry (`createCardImageLoader` over an injected `import.meta.glob` map, PNG-only, failure-tolerant). Generated artifacts live at `src/data/generated/card-images/<id>.json`.
- UI: `src/components/cardArt.ts` renders the src-less lazy `<img>`, the black mask, and the flavor caption, and `mountLazyCardArt` attaches art on reveal/scroll; `main.ts` mounts it once on the shell. The territory pattern is the fallback.
- Shared `escapeHtml` was consolidated into `src/util/html.ts` (was copied in cardFace/cardDetail/evidenceForm/deckShared).
- Generator: `scripts/generate-card-art.ts` via `vite-node`; `npm run art:prompts` needs no key, `npm run art:generate` writes normalized PNG JSON. OpenRouter credentials resolve from the environment, `.env`, or `~/.local/share/opencode/auth.json` and are never logged.
- Container drift fix: the pinned `google/gemini-3.1-flash-lite-image` sometimes ignores `output_format: png` and returns JPEG despite the request. `scripts/generate-card-art.ts` used to hard-reject any non-PNG `media_type`, wasting a paid generation; it now delegates to `normalizeProviderImage` (`scripts/cardImageOutput.ts`), which sniffs the actual bytes and transcodes any decodable raster into the 800×600 palette-PNG contract, failing with the card id + reported media type only when nothing decodable was returned.
- Verification: `npm run check` green (17 files, 88 tests) and `npm run build` green. The one visual test image was removed after review. The accept-all art loop has now structurally accepted `pleasure-01`; `pleasure-02` is next.

### Unaddressed backlog — parallel audit (prioritized)

- [x] P1 — Merge concurrent browser-tab updates instead of persisting full snapshots: a stale tab can overwrite newer records and evidence, losing user progress.
- [x] P2 — Validate evidence image bytes/content in addition to data URL syntax and claimed MIME type: mislabeled or invalid image data can be accepted as an artifact.
- [ ] P2 — Keep evidence entry reachable when opened from card detail despite active deck filters: the filtered-out card can leave the form hidden, blocking the intended flow.
- [ ] P2 — Restore focus when canceling the evidence form: removing the focused form element strands keyboard users without a predictable focus target.
- [ ] P3 — Give evidence artifact images descriptive alt text: generic alt text does not convey the image's relevant content to screen-reader users.
- [x] Rendered card artwork: reintroduced as generated 4:3 watercolor art (figure bible + territory palettes + deterministic prompt), base64 PNG, lazily attached on flip/scroll over the territory fallback, flavor text as a masked caption. Canon in `specs/art/ART-DIRECTION.md`.
- [ ] P1 — Generate all 52 base64 PNGs using `npm run art:loop` (48/52 structurally accepted; 4 remaining). The dedicated `PROMPT-ART.md`/`ralph-art.sh` selects one missing card per iteration, pins OpenRouter `google/gemini-3.1-flash-lite-image`, uses the local opencode auth store when no key env is present, validates 800×600/≤512 KiB, pauses on `.ralph-art.stop` after any failure, and exits on `.ralph-art.done` when complete. Do not make paid image requests outside this dedicated loop unless the operator explicitly requests them.

### Learnings — card-art generation iteration 1

- Generated only `pleasure-01` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and decoded to a valid nonempty PNG under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-02`.

### Learnings — card-art generation iteration 2

- Generated only `pleasure-02` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and decoded to a valid 800×600 PNG of 294,956 bytes, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-03`.

### Learnings — card-art generation iteration 3

- Generated only `pleasure-03` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and decoded to a valid 800×600 PNG of 281,107 bytes, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-04`.

### Learnings — card-art generation iteration 4

- Generated only `pleasure-04` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and decoded to a valid 800×600 PNG of 304,971 bytes, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-05`.

### Learnings — card-art generation iteration 5

- Generated only `pleasure-05` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 800×600 PNG of 307,402 bytes, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-06`.

### Learnings — card-art generation iteration 6

- Generated only `pleasure-06` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 800×600 PNG of 298,895 bytes, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-07`.

### Learnings — card-art generation iteration 7

- Generated only `pleasure-07` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 800×600 PNG of 277,434 bytes, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-08`.

### Learnings — card-art generation iteration 8

- Generated only `pleasure-08` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 800×600 PNG of 300,407 bytes, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-09`.

### Learnings — card-art generation iteration 9

- Generated only `pleasure-09` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 800×600 PNG of 287,278 bytes, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-10`.

### Learnings — card-art generation iteration 10

- Generated only `pleasure-10` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 800×600 PNG of 310,498 bytes, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `pleasure-11`.

### Learnings — card-art generation iteration 11

- Generated only `curiosity-11` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid PNG under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `curiosity-12`.

### Learnings — card-art generation iteration 12

- Generated only `curiosity-12` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 331,818-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `curiosity-13`.

### Learnings — card-art generation iteration 13

- Generated only `curiosity-13` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 310,289-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `curiosity-14`.

### Learnings — card-art generation iteration 14

- Generated only `curiosity-14` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 320,125-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `curiosity-15`.

### Learnings — card-art generation iteration 15

- Generated only `curiosity-15` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 315,381-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `curiosity-16`.

### Learnings — card-art generation iteration 16

- Generated only `curiosity-16` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 262,428-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `curiosity-17`.

### Learnings — card-art generation iteration 17

- Generated only `curiosity-17` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 326,189-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `curiosity-18`.

### Learnings — card-art generation iteration 18

- Generated only `curiosity-18` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 316,954-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `curiosity-19`.

### Learnings — card-art generation iteration 19

- Generated only `curiosity-19` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid PNG under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `curiosity-20`.

### Learnings — card-art generation iteration 20

- Generated only `curiosity-20` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 321,960-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-21`.

### Learnings — card-art generation iteration 21

- Generated only `beauty-21` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 264,761-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-22`.

### Learnings — card-art generation iteration 22

- Generated only `beauty-22` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 283,317-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-23`.

### Learnings — card-art generation iteration 23

- Generated only `beauty-23` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 335,894-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-24`.

### Learnings — card-art generation iteration 24

- Generated only `beauty-24` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 298,375-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-25`.

### Learnings — card-art generation iteration 25

- Generated only `beauty-25` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 266,892-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-26`.

### Learnings — card-art generation iteration 26

- Generated only `beauty-26` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 260,618-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-27`.

### Learnings — card-art generation iteration 27

- Generated only `beauty-27` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 314,977-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-28`.

### Learnings — card-art generation iteration 28

- Generated only `beauty-28` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 302,582-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-29`.

### Learnings — card-art generation iteration 29

- Generated only `beauty-29` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 318,129-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `beauty-30`.

### Learnings — card-art generation iteration 30

- Generated only `beauty-30` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 299,832-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-31`.

### Learnings — card-art generation iteration 31

- Generated only `connection-31` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 289,272-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-32`.

### Learnings — card-art generation iteration 32

- Generated only `connection-32` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 306,599-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-33`.

### Learnings — card-art generation iteration 33

- Generated only `connection-33` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 314,409-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-34`.

### Learnings — card-art generation iteration 34

- Generated only `connection-34` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 279,535-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-35`.

### Learnings — card-art generation iteration 35

- Generated only `connection-35` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 320,836-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-36`.

### Learnings — card-art generation iteration 36

- Generated only `connection-36` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned model and `800x600` dimensions, and fully decoded to a valid 266,670-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-37`.

### Learnings — card-art generation iteration 37

- Generated only `connection-37` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 289,180-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-38`.

### Learnings — card-art generation iteration 38

- Generated only `connection-38` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 299,313-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-39`.

### Learnings — card-art generation iteration 39

- Generated only `connection-39` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 315,985-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `connection-40`.

### Learnings — card-art generation iteration 40

- Generated only `connection-40` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 307,009-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `wonder-41`.

### Learnings — card-art generation iteration 41

- Generated only `wonder-41` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 309,781-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `wonder-42`.

### Learnings — card-art generation iteration 42

- Generated only `wonder-42` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 269,921-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `wonder-43`.

### Learnings — card-art generation iteration 43

- Generated only `wonder-43` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 308,778-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `wonder-44`.

### Learnings — card-art generation iteration 44

- Generated only `wonder-44` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 293,878-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `wonder-45`.

### Learnings — card-art generation iteration 45

- Generated only `wonder-45` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 359,109-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `wonder-46`.

### Learnings — card-art generation iteration 46

- Generated only `wonder-46` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 316,439-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `wonder-47`.

### Learnings — card-art generation iteration 47

- Generated only `wonder-47` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 273,703-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `wonder-48`.

### Learnings — card-art generation iteration 48

- Generated only `wonder-48` with the pinned OpenRouter model. Its artifact parsed as JSON, identified the pinned bare model id and `800x600` dimensions, and fully decoded to a valid 296,010-byte PNG, under 512 KiB.
- Per operator policy, structural validity is the acceptance criterion; the image was not visually reviewed. Next missing card: `wonder-49`.

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
