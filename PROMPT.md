# Ralph — Build Loop

0a. Study @SPEC.md and @DESIGN.md to learn what the product is. They are the source of truth for WHAT to build.

0b. Study @specs/** (one file per suit/category of cards) and @AGENT.md to learn HOW this repo builds, runs, tests, and the mandatory engineering standards (TDD, DDD, SOLID, no smells/duplication, no premature work, fast fixture/fake tests, no browser automation).

0c. Study @fix_plan.md. It is the single source of truth for what remains.

0d. Paid image generation is reserved for the dedicated `PROMPT-ART.md` selected by `npm run art:loop`. The normal build loop must not call `art:generate` or make image API requests.

1. Your task: pick THE single most important incomplete item from @fix_plan.md and implement it fully, using parallel subagents. Before making changes, search the codebase (don't assume not implemented) using subagents. You may use unlimited parallel subagents for searching/reading/writing files, but exactly ONE subagent for build/tests so the wheel does not jam.

2. After implementing functionality or resolving problems, run the tests for that unit of code that was improved (`npx tsc --noEmit && npx vitest run`). Follow strict TDD: the test exists and fails first, then implementation makes it pass. If functionality is missing then it's your job to add it per the specs. Think hard. If tests unrelated to your work fail, resolve them as part of this increment.

2b. Engineering standards are mandatory (see @AGENT.md): domain-driven design, SOLID, clean code, no smells, no duplication, no premature or speculative code. Tests use fast fixtures and injected fakes; never add or run browser automation (Playwright et al.) unless the operator explicitly asks in that turn.

3. When tests pass: update @fix_plan.md (mark done / add new learnings) using a subagent, then commit the smallest possible logical change: stage only that change's files (never `git add -A` across unrelated work) and write a conventional-commit message (`feat:`, `fix:`, `art:`, `ui:`, `docs:`, `refactor:`) describing it. When there are no build or test errors, create a git tag: if no tags exist start at `0.0.0`, else increment the patch (e.g. `0.0.1`). If a git remote exists, `git push --tags`; if not, skip pushing silently.

999. IMPORTANT: DO NOT IMPLEMENT PLACEHOLDER OR SIMPLE IMPLEMENTATIONS. WE WANT FULL IMPLEMENTATIONS. DO IT OR I WILL YELL AT YOU.

9999. IMPORTANT: When authoring tests or documentation, capture the WHY — explain what the test verifies and why it exists, so future loops without this context can decide to keep, fix, or delete it.

99999. IMPORTANT: If you discover a bug, resolve it with subagents, or document it in @fix_plan.md first, then move on — even if unrelated to the current item. Never let a discovered bug evaporate.

999999. IMPORTANT: Keep @fix_plan.md up to date with learnings using a subagent, especially at the end of your turn. Periodically clean out completed items using a subagent.

9999999. IMPORTANT: When you learn something new about how to build/run/test this project, update @AGENT.md using a subagent — but keep it brief. NEVER put status reports in @AGENT.md.

99999999. You may add extra logging if required to debug issues. Prefer logging over long debug sessions.

999999999. One item per loop. Do not start a second fix_plan item. If you finish early, improve tests or documentation for what you just built.

9999999999. Think hard. Follow existing code conventions. Single sources of truth, no adapters/migrations.