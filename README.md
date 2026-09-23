# Proof of Life

**Not merely a deck of prompts. A collectible adventure game.**

52 real-world missions rendered as fantasy-style collectible cards. Each card carries a quest, a Proof of Life requirement, and a philosophy: pleasure, curiosity, beauty, connection, and wonder don't have to defend their place on the calendar with productivity. Their evidence isn't what they produced — their evidence is the life that happened while pursuing them.

You don't win by getting through 52 cards fastest. There isn't even a deadline. When you're done, you're holding 52 pieces of evidence that you were here.

## The deck

Five territories — five schools of magic — plus two prismatic Wild Cards:

| Territory  | Color        | Symbol | Energy    | Cards |
| ---------- | ------------ | ------ | --------- | ----- |
| Pleasure   | Crimson/Rose | ♥      | Desire    | 01–10 |
| Curiosity  | Cobalt       | ◉      | Discovery | 11–20 |
| Beauty     | Gold         | ✦      | Attention | 21–30 |
| Connection | Emerald      | ∞      | Belonging | 31–40 |
| Wonder     | Violet       | ✧      | Awe       | 41–50 |
| Wild       | Prismatic    | ✵      | —         | 51–52 |

Every card: **name · territory + symbol · type line · rarity · art direction · quest · Proof of Life · reward · special ability · flavor text**. The Wilds sit above all — 51 _Follow the Thread_ (Legendary) and 52 _Proof of Life_ (Mythic), the philosophical center of the game.

### Card states

```
UNDISCOVERED → DRAWN → LIVED
```

Draw an adventure, live it in the real world, deposit your evidence in the **Archive**. No points, no deadlines, no leaderboards — progress is measured only in evidence accumulated.

## Tech

TypeScript + Vite, vanilla DOM, vitest. No backend, no accounts — deck state persists in `localStorage`. The deck data is typed in `src/data/` and held to contract by schema tests (exactly 52 cards, uniqueness, complete anatomy, frozen canon text).

## Getting started

```bash
npm install
npm run dev        # Vite dev server
npm run check      # tsc --noEmit && vitest run — must be green before any commit
npm run build      # production build
```

## Deployment (GitHub Pages)

A GitHub Actions pipeline (`.github/workflows/deploy.yml`) builds and publishes `dist/` to GitHub Pages on every push to `main` (and on tags):

1. `npm ci` → `npm run check` (typecheck + tests — the wheel) → `npm run build`
2. `dist/` is uploaded and deployed via `actions/deploy-pages`

One-time setup after adding the GitHub remote:

- Repo **Settings → Pages → Source: GitHub Actions**
- The site serves at `https://<owner>.github.io/<repo>/` — Vite is configured with a relative `base: "./"` so it works at any subpath.

## Repo layout

```
├── .github/workflows/deploy.yml   GitHub Pages build & deploy pipeline
├── SPEC.md            product spec — the source of truth for WHAT
├── DESIGN.md          technical design — the source of truth for HOW
├── specs/cards/       the frozen 52-card deck, one file per territory + wilds
├── PROMPT.md          Ralph build-loop prompt stack
├── PROMPT-PLAN.md     Ralph planning-loop prompt
├── fix_plan.md        living, priority-sorted build plan
├── AGENT.md           brief run/build/test instructions for agents
├── ralph.sh           the Ralph Wiggum loop (build mode)
├── ralph-plan.sh      the Ralph loop (planning mode)
└── src/               the app
```

## The Ralph harness

This repo is built with the [Ralph Wiggum technique](https://ghuntley.com/ralph/) — a bash loop running an agentic coding tool, one fix_plan item per loop, with type-check + tests as back pressure:

```bash
./ralph.sh                          # build loops (default 25)
MAX_ITERATIONS=5 ./ralph.sh         # smaller run
./ralph-plan.sh                     # planning loops — specs and plan only
```

Loop configuration lives in `.env` (see `.env.example`): `RALPH_MODEL` defaults to **openai luna** (`openrouter/~openai/gpt-luna-latest`), and visibility is on by default — thinking blocks (`--thinking`), harness logs (`--print-logs`), and a heartbeat whenever opencode goes silent (`RALPH_IDLE_SECONDS`). Every iteration is bannered with iteration count, HEAD, and tag, then streamed live and logged to `logs/`. Real environment variables override `.env`.

Each loop is logged to `logs/`. Rules of the house: search the codebase before assuming anything is missing, full implementations only (no placeholders), capture the _why_ in every test, and keep `fix_plan.md` honest.

## Status

- [x] Baseline spec + design (`SPEC.md`, `DESIGN.md`)
- [x] Complete 52-card deck seeded and **frozen** (operator content)
- [ ] Data pipeline + schema tests
- [ ] App: deck view, draw ritual, daily draw, card detail, evidence flow, Archive

Content rules: the 52 cards in `specs/cards/` are frozen — code transcribes them, never rewrites them.
