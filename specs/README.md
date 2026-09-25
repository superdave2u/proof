# specs/

One file per bounded area, consumed every build loop.

- `cards/` — six files: `pleasure.md`, `curiosity.md`, `beauty.md`, `connection.md`, `wonder.md` (cards 01–10, 11–20, 21–30, 31–40, 41–50) and `wilds.md` (51–52). **The deck is complete: 52 unique cards.**
- `art/` — `ART-DIRECTION.md`: the imagery canon (figure bible, territory palettes, prompt recipe, generation + lazy-delivery standard). It drives `src/data/cardArt.ts` and `scripts/generate-card-art.ts`.

Rules for spec consumers:
- **Ralph loops must leave all 52 cards unchanged**, including the 7 marked CANON; report requested card-text edits for the operator. In direct sessions, an explicit operator request authorizes editing only the requested card text, including canon. Build code transcribes the current specs.
- Search before creating — never assume a spec is missing or exists.
- No contradictions between files; SPEC.md wins ties.
- Rarity is assigned in the data pass per SPEC §3 (5 common / 3 uncommon / 2 rare per territory; wilds canon: 51 legendary, 52 mythic) — specs deliberately do not carry territory-card rarity.