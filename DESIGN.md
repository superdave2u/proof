# DESIGN.md — Proof of Life (technical design)

## 1. Visual identity — our own trade dress

Borrow the *feel* of a deep collectible card game. **Do not copy Magic: The Gathering trade dress** — no mana symbols, no MTG fonts, no lookalike frame. Our identity:

- **Territory palette** (CSS custom properties): `--pleasure: #c81e4f` (crimson/rose), `--curiosity: #1e4fc8` (cobalt), `--beauty: #c9a227` (gold), `--connection: #1e8a5a` (emerald), `--wonder: #7a3fc9` (violet), wild = animated prismatic gradient.
- **Symbols**: ♥ ◉ ✦ ∞ ✧ as large watermark sigils; ✵ for wilds.
- Typography: display serif for card names, humanist sans for body, small-caps for type lines. Vertical banner layout with a rounded-corner dark frame; territory color as a header band and inner border glow.
- Rarity gems in the header row; Legendary/Mythic get foil shimmer.
- **Card artwork**: a 4:3 landscape watercolor in the territory's tonal range, starring the recurring heroine (the Wayfarer). Generated offline per `specs/art/ART-DIRECTION.md`, stored as base64 PNG per card, lazily attached on reveal/scroll. The flavor text is its caption, over a black translucent mask at the image's foot. The territory atmosphere pattern remains the fallback when art is absent or still loading.

## 2. Card face layout (top to bottom)

1. Header band: `TERRITORY NN/52` (collector line) + rarity gem + territory symbol watermark.
2. Card name (display serif).
3. Type line: the card's mode (small caps), e.g. `Indulgence`, `Discovery`, `Legendary Wild`. Specs author `Invitation • <Mode>`; the parser drops the `Invitation • ` prefix.
4. **Artwork panel (4:3)** — the card's watercolor illustration, a 4:3 landscape base64 PNG, lazily attached on flip/scroll. Underneath (and as fallback when a card has no image yet) it shows a procedural territory atmosphere: layered washes, woven texture, and the territory sigil watermark; wilds get a prismatic sheen, mythic stays deep black with a violet edge glow. The image is cropped with `object-fit: cover`.
5. **Flavor caption** — italic, territory-tinted, pinned to the foot of the artwork panel as a `figcaption`, over a translucent black gradient mask between the text and the painting. It is the accessible text; the image `alt` is applied only once the image loads.
6. **Quest** block.
7. **Proof of Life** block.
8. **Special Stretch** box (if present) — distinct background, ability name bold.
9. Lived overlays: date stamp, evidence note, evidence photo thumb — clean, no wear effects.

Note: authored art-direction strings remain in the frozen card specs and in `Card.art`. They are not rendered as visible text on the face; they drive generation (alongside flavor, territory palette, and the figure bible) and appear only in the loaded image's `alt` description.

## 3. Data model (`src/data/`)

```ts
type Territory = "pleasure" | "curiosity" | "beauty" | "connection" | "wonder" | "wild";
type Rarity = "common" | "uncommon" | "rare" | "legendary" | "mythic";
type CardState = "undiscovered" | "drawn" | "lived";

interface Card {
  id: string;           // "pleasure-01"
  number: number;       // 1..52
  territory: Territory;
  name: string;
  typeLine: string;     // rendered mode, e.g. "Indulgence" / "Legendary Wild" (specs' "Invitation • " prefix dropped at transcribe time)
  rarity: Rarity;       // assigned in data pass per SPEC §3
  art: string;          // authored art-direction string — preserved, NOT rendered (atmosphere panel replaces artwork this release; reintroduced later)
  quest: string[];      // line-separated steps
  proof: string;
  ability?: { name: string; text: string };
  flavor: string;
}

interface Evidence { date: string; note: string; artifact?: string /* image dataURL, decoded size ≤ 512 KiB */ }
interface CardRecord { state: CardState; drawnAt?: string; livedAt?: string; evidence?: Evidence }
interface DeckState { version: 1; cards: Record<string, CardRecord>; dailyDraw?: { date: string; cardId: string } }

/** Generated card art — one lazily imported JSON module per rendered card. */
interface CardImageArtifact { dataUrl: string /* data:image/png;base64,... */; alt: string; prompt: string; model: string; size: string; generatedAt: string }
interface CardImageSource { load(cardId: string): Promise<string | undefined> }
```

- `src/data/cards.ts` exports `DECK: Card[]` (52) + `territories` metadata (color, symbol, energy, range).
- Rarity assignment happens in the data pass (specs hold creative content; data adds rarity per the 5/3/2 pattern; wilds canon: 51 legendary, 52 mythic).

## 4. Persistence

- `localStorage["proof-of-life:deck:v1"]` holds `DeckState`.
- Versioned key; a migration stub is forbidden — version bump + reader handles older shapes explicitly if ever needed.
- State machine: `undiscovered → drawn → lived`, forward-only, enforced in the store module.

## 5. Screens / UX flow

1. **Home** (`#/deck`) — the daily card only: the date-seeded reveal (deterministic, shown once per day) plus small links to the Gallery and the Archive. Nothing else lives here.
2. **Gallery** (`#/gallery`) — the whole deck on its own page, modeled on the Archive: all 52 cards (backs pristine, fronts by state) with territory/state filters, the deck-wide lived count, and rows whose cards align vertically with their peers. There is no manual draw button anywhere — the daily deal is the only reveal. Local development is the exception: the dev server and localhost show a per-card "Flip card" control (`store.revealCard`) so states can be exercised without waiting a day.
3. **Card detail** (`#/card/<id>`) — revealed cards show the full anatomy with their state action (`Deposited my Proof of Life` for drawn → evidence form; `View in the Archive` for lived). Undiscovered cards stay face-down on deep links: the page shows the card back (territory, number, Undiscovered) and a status note — never the name, quest, or flavor. The artwork panel fills the card body width; the flavor is its caption.
4. **Archive** (`#/archive`) — Lived cards with their evidence; the collected-evidence gallery. The emotional payoff screen.

The home page holds only the daily card in a centered column (like the detail view's card column); the daily flip is the sole entry into DRAWN.

## 6. Lived presentation — no weathering (operator decision)

The physical deck weathers (SPEC §6); **the digital app does not simulate wear**. No rotation, stains, tape, bent-corner shading, or handwriting effects. A Lived card is shown cleanly with its date, evidence note, and artifact attached. Marking a card Lived changes its state presentation (pristine face → lived record with evidence), not its texture.

## 7. File layout

```
src/
├── main.ts            # bootstrap, screen router (hash-based: deck/gallery/archive/card)
├── router.ts          # hash router + route resolution
├── app.ts             # app title/metadata
├── style.css          # design tokens, territory palette, card face, lived overlays
├── data/
│   ├── cards.ts       # DECK: Card[] (52)
│   ├── specDeck.ts    # parser for the frozen specs/cards/*.md (integrity source)
│   ├── cardArt.ts     # figure bible, territory art palettes, deterministic prompt/alt builders
│   ├── cardImages.ts  # lazy base64-PNG registry (import.meta.glob over generated per-card JSON)
│   ├── generated/card-images/<id>.json  # generated art artifacts (dataUrl + prompt metadata)
│   └── *.test.ts      # schema/integrity tests
├── state/
│   ├── store.ts       # DeckState load/save, state machine, daily draw (date-seeded)
│   ├── evidence.ts    # evidence validation + artifact caps
│   └── *.test.ts
├── views/
│   ├── deckShared.ts  # deck domain types, filterDeck, shared view helpers
│   ├── home.ts        # home page: daily card + links to Gallery/Archive
│   ├── gallery.ts     # gallery page: random deal + full deck grid + filters
│   ├── cardDetail.ts  # card detail page: full face + the only deposit flow
│   ├── archive.ts     # archive page: Lived evidence collection
│   └── *.test.ts
└── components/
    ├── cardFace.ts    # renders Card + CardRecord (preview + full faces)
    ├── cardArt.ts     # artwork figure (image + caption + mask) and lazy hydration
    └── evidenceForm.ts # deposit form markup + evidence assembly/validation
```

Vanilla TS + template literals (fast wheel). Framework adoption is a deliberate later decision, not a default.

## 8. Testing strategy (why-driven)

- **cards.test.ts** — the deck is the product; schema is the contract (52, uniqueness, anatomy completeness, canon text preserved verbatim).
- **cardArt.test.ts** — the imagery canon is a contract too: every card resolves a deterministic prompt that carries the figure bible, its frozen scene and flavor, its territory palette, the 4:3 aspect, and the negative list; wilds get the prismatic palette.
- **cardImages.test.ts** — lazy delivery can't misbehave: a missing module loads `undefined`, an invalid/non-PNG payload is rejected, a valid base64 PNG data URL loads, and a throwing loader degrades to `undefined` instead of crashing the face.
- **store.test.ts** — state machine can't cheat: no skipping states, no un-living, daily draw deterministic per date.
- Wheel: `npm run check` (tsc strict + vitest) before every commit.

## 9. Accessibility

- Territory colors must pass 4.5:1 for text usage (gold/violet need dark-adjacent pairings); symbols always paired with the territory name (never color/symbol alone).
- Full keyboard flow: deck → draw → detail → evidence form.
- `prefers-reduced-motion` disables deal/foil animations.
- Card faces readable at 320px width (mobile-first).
- Artwork is presented decoratively: the caption is the accessible text, the image starts with an empty `alt` and receives its description only once loaded, and the black caption mask keeps the territory-tinted text readable over any painting.

## 10. Imagery pipeline

- **Source of truth**: `specs/art/ART-DIRECTION.md` — figure bible, territory palettes, prompt recipe, generation standard, delivery contract.
- **Prompt domain** (`src/data/cardArt.ts`): `FIGURE_BIBLE`, `ART_PALETTES` (one tonal range per territory), `buildCardArtPrompt(card)` and `cardArtAlt(card)`. Pure and deterministic; no IO, no randomness.
- **Generation** (`scripts/generate-card-art.ts`, run with `vite-node`): `npm run art:prompts` writes the per-card prompts without a key; `npm run art:generate` calls OpenRouter's Image API by default and writes `src/data/generated/card-images/<id>.json`. `scripts/cardImageOutput.ts` uses `sharp` to center-crop/resize provider output to 800×600 and encode a compressed palette PNG; `npm run art:optimize` reprocesses already generated artifacts without a network call. Generated files are committed so the GitHub Pages build ships art.
- **Lazy registry** (`src/data/cardImages.ts`): `createCardImageLoader(modules)` takes the `import.meta.glob` map so the per-card JSON (and its base64 bytes) loads only when requested; `setCardImageSource`/`resetCardImageSource` inject a fake for tests. Only `data:image/png;base64,` payloads are accepted.
- **Lazy hydration** (`src/components/cardArt.ts`): `renderCardArt(card)` emits the `card-art` figure with a src-less lazy `<img>`, the territory fallback, the dark mask, and the flavor caption. `mountLazyCardArt(root, load)` scans the shell and watches mutations; an `IntersectionObserver` (or immediate load where unavailable) attaches `src` when a card is revealed or scrolled into view. `main.ts` mounts it once on the app shell.
- **Fallback**: no generated image (or a loader failure) leaves the territory atmosphere pattern in place; the face never breaks or shows a broken image.
