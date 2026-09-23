# Ralph — Planning Loop (DO NOT IMPLEMENT ANYTHING)

You are in PLANNING MODE. Your ONLY job is to verify the deck and plan the build. Do NOT write application source code, do NOT fix tests. Documentation and plan updates only.

Context to study:
- @SPEC.md (product), @DESIGN.md (technical) — both done and frozen.
- @specs/cards/*.md — the complete 52-card deck, frozen operator content. Read them; never edit them.
- @fix_plan.md tracks what remains. @AGENT.md documents the repo.

Task:
1. Verify deck integrity across specs/cards/*.md: exactly 52 cards, numbering 01–52 with no gaps or duplicates, unique titles, every field of the anatomy present (SPEC §3), canon cards untouched. Report and fix ONLY structural gaps (e.g. a malformed card block) — never rewrite card content.
2. Create/update @fix_plan.md — a priority-sorted build plan derived by comparing DESIGN.md and the deck specs against the actual codebase. Search the codebase (don't assume not implemented). Mark verified work done; prune completed items periodically. The build plan starts with the data pipeline (typed deck + schema tests) before any UI.
3. Commit plan work: `git add -A && git commit -m "docs: ..."`. No implementation, no tags.

Rules:
- The deck is frozen. If you believe a card is flawed, document the concern in fix_plan.md for the operator — do not edit the card.
- Keep fix_plan.md honest: only mark items done if the work actually exists.
- Think hard; use subagents for cross-file verification.