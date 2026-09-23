# AGENT.md — how to run this repo

Brief instructions for any agent working here. Keep this file brief and current. NEVER put status reports here.

## Project

**Proof of Life** — a 52-card collectible adventure game for personal development, shipped as a TypeScript + Vite web app. Specs live in `SPEC.md` (product), `DESIGN.md` (technical), and `specs/cards/*.md` (the deck).

## Content rules

- `specs/cards/*.md` cards marked **CANON** are operator-authored — never edit them; match their voice for new cards.
- `specs/cards/wilds.md` is complete (cards 51–52). Do not touch it.
- Rarity is assigned in the data pass, not in specs (SPEC §3).

## Commands

- Install: `npm install`
- Dev server: `npm run dev` (Vite, http://localhost:5173)
- Type-check: `npm run typecheck` (tsc --noEmit) — REQUIRED before commit
- Unit tests: `npm test` (vitest run) — REQUIRED before commit
- Both at once (the wheel): `npm run check`
- Production build: `npm run build`

## Conventions

- Back pressure = `npm run check` must be green before every commit.
- Tests live next to source (`*.test.ts`), with a docblock explaining WHY the test exists.
- Deck data is typed in `src/data/`; schema tests assert 52 cards (10 per territory + 2 wilds), unique ids/numbers/names, complete anatomy, and canon text preserved verbatim.
- One fix_plan item per loop. See `PROMPT.md`.
