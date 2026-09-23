# AGENT.md — how to run this repo

Brief instructions for any agent working here. Keep this file brief and current. NEVER put status reports here.

## Project

**Proof of Life** — a 52-card collectible adventure game for personal development, shipped as a TypeScript + Vite web app. Specs live in `SPEC.md` (product), `DESIGN.md` (technical), and `specs/cards/*.md` (the deck).

## Content rules

- **The 52-card deck in `specs/cards/*.md` is frozen operator content** — never edit card text; code transcribes it.
- Rarity is assigned in the data pass, not in specs (SPEC §3: 5 common / 3 uncommon / 2 rare per territory; wilds canon legendary/mythic).

## Commands

- Install: `npm install`
- Dev server: `npm run dev` (Vite, http://localhost:5173)
- Type-check: `npm run typecheck` (tsc --noEmit) — REQUIRED before commit
- Unit tests: `npm test` (vitest run) — REQUIRED before commit
- Both at once (the wheel): `npm run check`
- Production build: `npm run build`

## Deployment

GitHub Pages via `.github/workflows/deploy.yml` — runs on push to `main`/tags: `npm ci`, `npm run check`, `npm run build`, publishes `dist/` via actions/deploy-pages. Vite uses `base: "./"` for subpath hosting.

## Conventions

- Back pressure = `npm run check` must be green before every commit.
- Tests live next to source (`*.test.ts`), with a docblock explaining WHY the test exists.
- Deck data is typed in `src/data/`; schema tests assert 52 cards (10 per territory + 2 wilds), unique ids/numbers/names, complete anatomy, and canon text preserved verbatim.
- `src/data/specDeck.ts` parses the frozen `specs/cards/*.md` via vite `?raw` imports; `specDeck.test.ts` is the permanent deck-integrity audit. If it fails, the frozen deck was edited — escalate in fix_plan.md, never edit the specs. The parser strips emphasis/quote markup but preserves verbatim words and line structure.
- One fix_plan item per loop. See `PROMPT.md`.
