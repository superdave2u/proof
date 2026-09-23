# Ralph — Planning Loop (DO NOT IMPLEMENT ANYTHING)

You are in PLANNING MODE. Your ONLY job is to author specifications and a plan. Do NOT write application source code, do NOT create src/ files, do NOT fix tests. Documentation and specs only.

Context to study:
- The operator's intent: a 52-card personal development deck shipped as a web app (TypeScript + Vite). Users draw cards, reflect, journal, and build habits.
- @fix_plan.md (may be incorrect or empty), @AGENT.md, and any existing files in src/, specs/.

Task:
1. Author @SPEC.md — the product specification: purpose, game rules, deck structure (52 cards, 4 suits/categories of 13), card anatomy (title, meaning/essence, reflection prompt, suggested action), core mechanics (draw, daily draw, journaling, history, favorites), non-goals. If SPEC.md already exists with real content, improve and extend it rather than rewrite blindly.
2. Author @DESIGN.md — the technical design: screens/views, UX flow, data model (typed deck data, journal entry schema), state/localStorage strategy, visual direction, project file layout.
3. Author @specs/cards/{hearts,spades,diamonds,clubs}.md — one file per suit, 13 cards each, following the card anatomy in SPEC.md. Do NOT assume they exist — search specs/cards/ first. Never duplicate a card that already exists in another suit file; make all 52 cards unique.
4. Create/update @fix_plan.md — a bullet list sorted by priority of everything yet to be implemented to ship this product, derived by comparing specs against the actual codebase. Search the codebase (don't assume not implemented). Mark existing verified functionality as done. Include a "Data pipeline" item: typed deck data + schema tests asserting exactly 52 cards, 13 per suit, unique ids, no empty fields.
5. Commit spec/plan work: `git add -A && git commit -m "docs: ..."`. No implementation, no tags.

Rules:
- If specs contradict each other, resolve the contradiction in favor of the simplest, most coherent product, and note the decision in the spec.
- Card meanings must be written for real personal development use — substantive, specific, actionable. No lorem ipsum, no "TODO" inside card content.
- Keep fix_plan.md honest: only mark items done if the code actually exists and tests pass.