# Proof of Life

**Not merely a deck of prompts. A collectible game of invitations.**

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

Every card: **name · territory + symbol · type line · rarity · artwork · quest · Proof of Life · special stretch · flavor text**. The Wilds sit above all — 51 _Follow the Thread_ (Legendary) and 52 _Proof of Life_ (Mythic), the philosophical center of the game.

### Card art

Each card's artwork is a **4:3 landscape watercolor** of the scene in its art direction, painted through its flavor and intention in the territory's tonal range, starring one recurring heroine (the Wayfarer). The canon — figure bible, territory palettes, prompt recipe, generation standard — lives in [`specs/art/ART-DIRECTION.md`](specs/art/ART-DIRECTION.md). Art is generated offline as **base64 PNGs**, committed per card, and **lazily attached** when a card is flipped or scrolled into view; the flavor text is its caption over a translucent black mask. The territory atmosphere panel is the fallback when art is absent.

### Card states

```
UNDISCOVERED → DRAWN → LIVED
```

Draw an invitation, live it in the real world, deposit your evidence in the **Archive**. No points, no deadlines, no leaderboards — progress is measured only in evidence accumulated.

## Tech

TypeScript + Vite, vanilla DOM, vitest. No backend, no accounts — when browser storage is available, draws and Lived evidence (including optional photos) persist in versioned `localStorage`. The deck data is typed in `src/data/` and held to contract by schema tests (exactly 52 cards, uniqueness, complete anatomy, frozen canon text).

## Getting started

Engineering standards for all code here live in [`AGENT.md`](AGENT.md) — TDD, domain-driven design, SOLID, clean code, fast fixture/fake tests. Browser automation is not part of the test suite.

```bash
npm install
npm run dev        # Vite dev server
npm run check      # tsc --noEmit && vitest run — must be green before any commit
npm run build      # production build
npm run art:prompts    # write the deterministic art prompt for every card
npm run art:test       # generate one card via OpenRouter (google/gemini-3.1-flash-lite-image)
npm run art:generate   # generate base64 PNGs (OpenRouter auth store or OPENROUTER_API_KEY)
npm run art:optimize   # crop/resize/re-encode existing PNGs to compact 800x600
npm run art:loop       # Ralph: one reviewed OpenRouter image per iteration
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
├── specs/art/         the watercolor canon — figure bible, palettes, prompt recipe
├── scripts/           offline card-art generation
├── PROMPT.md          Ralph build-loop prompt stack
├── PROMPT-ART.md      one-image-per-iteration OpenRouter art prompt
├── PROMPT-PLAN.md     Ralph planning-loop prompt
├── fix_plan.md        living, priority-sorted build plan
├── AGENT.md           brief run/build/test instructions for agents
├── ralph.sh           the Ralph Wiggum loop (build mode)
├── ralph-art.sh       the OpenRouter one-image-at-a-time loop
├── ralph-plan.sh      the Ralph loop (planning mode)
└── src/               the app
```

## The Ralph harness

This repo is built with the [Ralph Wiggum technique](https://ghuntley.com/ralph/) — a bash loop running an agentic coding tool, one fix_plan item per loop, with type-check + tests as back pressure:

```bash
./ralph.sh                          # build loops (default 25)
MAX_ITERATIONS=5 ./ralph.sh         # smaller run
./ralph-plan.sh                     # planning loops — specs and plan only
npm run art:loop                    # OpenRouter image loop — one reviewed image per iteration
```

Loop configuration lives in `.env` (see `.env.example`): `RALPH_MODEL` defaults to **openai luna** (`openrouter/~openai/gpt-luna-latest`), and visibility is on by default — thinking blocks (`--thinking`), harness logs (`--print-logs`), and a heartbeat whenever opencode goes silent (`RALPH_IDLE_SECONDS`). Every iteration is bannered with iteration count, HEAD, and tag, then streamed live and logged to `logs/`. Real environment variables override `.env`.

Each loop is logged to `logs/`. Rules of the house: search the codebase before assuming anything is missing, full implementations only (no placeholders), capture the _why_ in every test, and keep `fix_plan.md` honest.

## Status

- [x] Baseline spec + design (`SPEC.md`, `DESIGN.md`)
- [x] Complete 52-card deck seeded and **frozen** (operator content)
- [ ] Data pipeline + schema tests
- [x] App: deck view, draw ritual, daily draw, evidence flow
- [ ] App: card detail, Archive

Content rules: the 52 cards in `specs/cards/` are frozen — code transcribes them, never rewrites them.
