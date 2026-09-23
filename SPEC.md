# SPEC.md — Proof of Life

**Not merely a deck of prompts. A collectible adventure game.**

Each of the 52 missions is its own fantasy-style card with a name, territory/color, rarity, evocative flavor text, a quest mechanic, and a physical artifact required to "complete" the card. The digital app renders, deals, and archives this deck.

## 1. Purpose

A real-world adventure game disguised as a collectible card game. The player is dealt adventures; completing them in physical reality produces **evidence of a life lived**. There is no score, no winner, no deadline. You do not win by getting through 52 cards fastest.

The pristine deck represents the life you *could* experience. The battered deck represents the life you **actually did**. Eventually the player isn't holding 52 inspirational cards — they're holding **52 pieces of evidence that they were here**.

## 2. Deck structure — 52 cards

Five territories function like five schools of magic, plus two Wild Cards with prismatic treatments:

| Territory  | Color        | Symbol | Energy    | Card numbers |
| ---------- | ------------ | ------ | --------- | ------------ |
| Pleasure   | Crimson/Rose | ♥      | Desire    | 01–10        |
| Curiosity  | Cobalt       | ◉      | Discovery | 11–20        |
| Beauty     | Gold         | ✦      | Attention | 21–30        |
| Connection | Emerald      | ∞      | Belonging | 31–40        |
| Wonder     | Violet       | ✧      | Awe       | 41–50        |
| Wild       | Prismatic    | ✵      | —         | 51–52        |

- 10 cards per territory, 2 Wild Cards, **52 unique cards total**.
- Collector numbering is global and displayed as `TERRITORY NN/52` (e.g. `PLEASURE 01/52`).

## 3. Card anatomy — every card has all of these

1. **CARD NAME** — dramatic, memorable title (*The Ridiculous Dessert*, *Follow the Music*, *The Road Not Taken*).
2. **TERRITORY + SYMBOL** — color and glyph from the table above.
3. **CARD TYPE** — `Adventure • <Mode>`. Modes: Discovery, Encounter, Indulgence, Pilgrimage, Creation, Offering, Pursuit.
4. **RARITY** — within each territory: 5 common, 3 uncommon, 2 rare. The Wilds sit above all: **51 = Legendary**, **52 = Mythic** (the philosophical center of the game — its Black Lotus, valuable for meaning, not money).
5. **ARTWORK / ART DIRECTION** — cinematic illustration of the adventure, never literally showing someone completing it. Almost magical realism. Authored as an art-direction string (scene, mood, light).
6. **THE QUEST** — the actual action the player must undertake.
7. **PROOF OF LIFE** — the physical evidence required to claim the card.
8. **REWARD** — placing evidence in the Archive; the card becomes **Lived**.
9. **SPECIAL ABILITY** (optional) — a named rule that modifies how the quest is performed or what it yields (e.g. *Unknown Territory*, *Useless Beauty*, *Inheritance*, *Encore*, *Serendipity*, *Alive*). Abilities are experiential modifiers, never scored points.
10. **FLAVOR TEXT** — the philosophy woven through the game.

## 4. Canon exemplar cards

Seven cards are **CANON** — authored by the operator and captured verbatim in `specs/cards/`. They set the style bar; all other cards must meet it. Canon cards must never be edited:

- `specs/cards/pleasure.md` — 01/52 **The Ridiculous Dessert**
- `specs/cards/curiosity.md` — 17/52 **Follow the Stranger's Map**
- `specs/cards/beauty.md` — 23/52 **Flowers for No Occasion**
- `specs/cards/connection.md` — 32/52 **The Story You Never Asked For**
- `specs/cards/wonder.md` — 43/52 **Follow the Music**
- `specs/cards/wilds.md` — 51/52 **Follow the Thread** (Legendary) and 52/52 **Proof of Life** (Mythic)

## 5. Card states — the lifecycle

Every card has exactly three states:

```
UNDISCOVERED → DRAWN → LIVED
```

- **UNDISCOVERED** — pristine, face-down in the deck.
- **DRAWN** — the deal. The daily flip must feel like *"you've just been dealt an adventure"*, not "pick an activity".
- **LIVED** — the player completed the quest and deposited Proof of Life in the **Archive**.

## 6. The Archive & the record of a life

The Archive is the collection of Lived cards. When a card becomes Lived, the player's record grows:

- the date it was completed,
- the evidence note (a sentence, a recipe, a list of names),
- the artifact — receipt, ticket, photograph — recorded against the card.

**The physical deck transforms as described above; the digital app does not simulate wear.** Lived cards are presented cleanly — with their date, note, and evidence attached — with no procedural weathering, stains, tape, bent corners, or simulated handwriting effects. The pristine deck is potential; the lived record is the life that happened. The evidence itself carries the transformation, not the pixels.

## 7. Mechanics

- **Daily draw (the only reveal)** — one date-seeded card per day, deterministic, no rerolls. The daily flip is the only way a card becomes DRAWN; there is no manual draw button anywhere in the app.
- **No deadlines, no streak requirements, no completion percentage pressure.** Progress is measured only in evidence accumulated.
- **Wild Cards** — arrive through the daily deal like any other; visually spectacular (prismatic/iridescent).

## 8. Philosophy (must be preserved in all copy)

- Pleasure, curiosity, beauty, connection, and wonder don't have to defend their place on the calendar with productivity.
- Their evidence isn't what they produced. Their evidence is the life that happened while pursuing them.
- Nothing is optimized, compared, or scored. Card 52 cannot be completed for points.

## 9. Non-goals

- No accounts, backend, or multiplayer.
- No payments, shop, or financial rarity market.
- No gamified points, leaderboards, streak penalties, or deadlines.
- No social sharing as a core mechanic.

## 10. Acceptance criteria

1. Data pipeline holds **exactly 52 cards**, 10 per territory + 2 wilds, globally unique numbers, names, and ids.
2. Every card has a complete anatomy (§3) — no empty fields, no placeholders.
3. The 7 canon cards match the operator text exactly.
4. State machine enforces `UNDISCOVERED → DRAWN → LIVED` (forward-only).
5. Daily draw is deterministic per date and stable across reloads.
6. `npm run check` green at every commit.