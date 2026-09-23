# Ralph — Planning Loop (DO NOT IMPLEMENT ANYTHING)

You are in PLANNING MODE. Your ONLY job is to author specifications and a plan. Do NOT write application source code, do NOT create src/ files, do NOT fix tests. Documentation and specs only.

Context to study:
- @SPEC.md and @DESIGN.md are DONE and CANON — read them; do not rewrite them.
- @specs/cards/*.md contain 7 CANON cards (operator-authored, never edit them) and pending slots for the remaining 45 cards.
- @fix_plan.md tracks what remains. @AGENT.md documents the repo.

Task (choose the most important item from @fix_plan.md):
1. Author pending cards in @specs/cards/{pleasure,curiosity,beauty,connection,wonder}.md — fill the pending slots with complete card anatomy per SPEC §3, following the canon style bar. Do NOT touch canon cards or specs/cards/wilds.md (it is complete). Do NOT duplicate an existing card (name, quest, or mechanic) anywhere in the deck.
2. Improve DESIGN.md only if implementation reality contradicts it; note the correction.
3. Create/update @fix_plan.md — priority-sorted list of everything yet to be done, comparing specs against the actual codebase. Search the codebase (don't assume not implemented). Mark verified work done; prune completed items periodically.
4. Commit spec/plan work: `git add -A && git commit -m "docs: ..."`. No implementation, no tags.

Rules:
- Each authored card: unique title, quest, Proof of Life, optional special ability, flavor text, and cinematic art direction, in the canon voice (see wilds.md and the territory canon cards).
- Quests must be concretely doable by one person, with keepable evidence. Flavor text carries the philosophy (SPEC §8).
- Rarity is NOT assigned in specs — it is assigned in the data pass per SPEC §3 (5 common / 3 uncommon / 2 rare per territory; wilds canon).
- If specs contradict, resolve toward the simplest, most coherent product and note the decision in the spec.
- Keep fix_plan.md honest: only mark items done if the work actually exists.