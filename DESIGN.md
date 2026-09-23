# DESIGN.md — Proof of Life (technical design)

## 1. Visual identity — our own trade dress

Borrow the *feel* of a deep collectible card game. **Do not copy Magic: The Gathering trade dress** — no mana symbols, no MTG fonts, no lookalike frame. Our identity:

- **Territory palette** (CSS custom properties): `--pleasure: #c81e4f` (crimson/rose), `--curiosity: #1e4fc8` (cobalt), `--beauty: #c9a227` (gold), `--connection: #1e8a5a` (emerald), `--wonder: #7a3fc9` (violet), wild = animated prismatic gradient.
- **Symbols**: ♥ ◉ ✦ ∞ ✧ as large watermark sigils; ✵ for wilds.
- Typography: display serif for card names, humanist sans for body, small-caps for type lines. Vertical banner layout with a rounded-corner dark frame; territory color as a header band and inner border glow.
- Rarity gems in the header row; Legendary/Mythic get foil shimmer.

## 2. Card face layout (top to bottom)

1. Header band: `TERRITORY NN/52` (collector line) + rarity gem + territory symbol watermark.
2. Card name (display serif).
3. Type line: the card's mode (small caps), e.g. `Indulgence`, `Discovery`, `Legendary Wild`. Specs author `Adventure • <Mode>`; the parser drops the `Adventure • ` prefix.
4. **Territory atmosphere panel (4:3)** — no rendered artwork in this release. A procedural background pattern within the territory's color and tonal range: layered washes, woven texture, and the territory sigil as a large watermark; wilds get a prismatic sheen, mythic stays deep black with a violet edge glow.
5. **Flavor text** — italic, territory-tinted, rendered *inside* the atmosphere panel, centered vertically and horizontally in the 4:3 negative space over a soft radial scrim.
6. **Quest** block.
7. **Proof of Life** block.
8. **Special Ability** box (if present) — distinct background, ability name bold.
9. **Reward** line.
10. Lived overlays: date stamp, evidence note, evidence photo thumb — clean, no wear effects.

Note: authored art-direction strings remain in the frozen card specs and in `Card.art` — they are reintroduced as rendered artwork in a later update. They are not displayed on the face in this release.

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
  typeLine: string;     // rendered mode, e.g. "Indulgence" / "Legendary Wild" (specs' "Adventure • " prefix dropped at transcribe time)
  rarity: Rarity;       // assigned in data pass per SPEC §3
  art: string;          // authored art-direction string — preserved, NOT rendered (atmosphere panel replaces artwork this release; reintroduced later)
  quest: string[];      // line-separated steps
  proof: string;
  ability?: { name: string; text: string };
  reward: string;
  flavor: string;
}

interface Evidence { date: string; note: string; artifact?: string /* image dataURL, decoded size ≤ 512 KiB */ }
interface CardRecord { state: CardState; drawnAt?: string; livedAt?: string; evidence?: Evidence }
interface DeckState { version: 1; cards: Record<string, CardRecord>; dailyDraw?: { date: string; cardId: string } }
```

- `src/data/cards.ts` exports `DECK: Card[]` (52) + `territories` metadata (color, symbol, energy, range).
- Rarity assignment happens in the data pass (specs hold creative content; data adds rarity per the 5/3/2 pattern; wilds canon: 51 legendary, 52 mythic).

## 4. Persistence

- `localStorage["proof-of-life:deck:v1"]` holds `DeckState`.
- Versioned key; a migration stub is forbidden — version bump + reader handles older shapes explicitly if ever needed.
- State machine: `undiscovered → drawn → lived`, forward-only, enforced in the store module.

## 5. Screens / UX flow

1. **Home** (`#/deck`) — the daily card only: the date-seeded reveal (deterministic, shown once per day) plus small links to the Gallery and the Archive. Nothing else lives here.
2. **Gallery** (`#/gallery`) — the whole deck on its own page, modeled on the Archive: the random deal ritual, all 52 cards (backs pristine, fronts by state) with territory/state filters and the deck-wide lived count.
3. **Card detail** (`#/card/<id>`) — full anatomy; actions: `Draw` (undiscovered → drawn), `Deposited my Proof of Life` (opens evidence form: date, note, optional artifact photo → lived), `View in the Archive` (lived). Flavor moment of quiet: the flavor text reveals inside the atmosphere panel with a gentle fade.
4. **Archive** (`#/archive`) — Lived cards with their evidence; the collected-evidence gallery. The emotional payoff screen.

The draw ritual lives on the Gallery page (it deals from the deck); the home page stays a single daily card.

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
    └── evidenceForm.ts # deposit form markup + evidence assembly/validation
```

Vanilla TS + template literals (fast wheel). Framework adoption is a deliberate later decision, not a default.

## 8. Testing strategy (why-driven)

- **cards.test.ts** — the deck is the product; schema is the contract (52, uniqueness, anatomy completeness, canon text preserved verbatim).
- **store.test.ts** — state machine can't cheat: no skipping states, no un-living, daily draw deterministic per date.
- Wheel: `npm run check` (tsc strict + vitest) before every commit.

## 9. Accessibility

- Territory colors must pass 4.5:1 for text usage (gold/violet need dark-adjacent pairings); symbols always paired with the territory name (never color/symbol alone).
- Full keyboard flow: deck → draw → detail → evidence form.
- `prefers-reduced-motion` disables deal/foil animations.
- Card faces readable at 320px width (mobile-first).
