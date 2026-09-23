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

## Engineering standards (mandatory)

- **TDD first.** For every behavior change, write or extend the test first (red), then the implementation (green), then refactor. A change is done only when a test fails without it. Tests carry a `WHY` docblock (see existing `*.test.ts`).
- **Domain-driven design.** Model the domain (`Card`, deck lifecycle, evidence, draw rules) in `src/data/` and `src/state/` using the game's language. UI (`src/views/`, `src/components/`) stays thin and delegates to the domain. Domain modules must not depend on the DOM, `window`, `localStorage`, `Date.now`, or `Math.random` directly — inject those at the edges.
- **Clean code + SOLID.** Single responsibility per module/function; small intention-revealing names; dependency inversion at boundaries (storage, clock, randomness); open for extension without editing callers. Prefer composition over flags/conditionals.
- **No smells, no duplication, no premature work.** No copy-paste logic, dead code, speculative abstractions, placeholder or partial implementations, or "just in case" code. Build exactly the current `fix_plan.md` item; YAGNI applies. Any discovered bug gets fixed or recorded in `fix_plan.md` in the same change.
- **Fast tests with fixtures and fakes.** Vitest in node env. Unit-test pure domain logic; drive integration through injected fakes (in-memory storage, fixed clock, seeded RNG). Mock at process boundaries only, never internals. No network, no real timers (use fake timers), no sleeps. Keep the whole suite fast (target: seconds, not minutes).
- **Browser automation is forbidden by default.** Never add or run Playwright, Puppeteer, Cypress, or any real-browser driver as part of the test suite or a normal loop. It is a last-resort debugging tool only, and only when the operator explicitly asks for it in that turn.

## Conventions

- Back pressure = `npm run check` must be green before every commit.
- Tests live next to source (`*.test.ts`), with a docblock explaining WHY the test exists.
- Vitest runs in node and stubs CSS imports; stylesheet assertions should read `src/style.css` from disk, as `appShell.test.ts` does.
- Deck data is typed in `src/data/`; schema tests assert 52 cards (10 per territory + 2 wilds), unique ids/numbers/names, complete anatomy, and canon text preserved verbatim.
- `src/data/specDeck.ts` parses the frozen `specs/cards/*.md` via vite `?raw` imports; `specDeck.test.ts` is the permanent deck-integrity audit. If it fails, the frozen deck was edited — escalate in fix_plan.md, never edit the specs. The parser strips emphasis/quote markup but preserves verbatim words and line structure.
- One fix_plan item per loop. See `PROMPT.md`.
