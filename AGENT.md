# AGENT.md — how to run this repo

Brief instructions for any agent working here. Keep this file brief and current. NEVER put status reports here.

## Project

A 52-card personal development deck, shipped as a TypeScript + Vite web app. Specs live in `SPEC.md`, `DESIGN.md`, and `specs/`.

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
- Deck data is typed in `src/data/`; schema tests assert 52 cards, 13 per suit, unique ids, no empty fields.
- One fix_plan item per loop. See `PROMPT.md`.