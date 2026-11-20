## 1. Server
- [x] 1.1 Tests first: `test/unit/word-plan.test.ts` (kept plan, filter by owned decks, new plan when short or old, AI fails, no profile, the Claude planner reads JSON) and `test/integration/word-plan.test.ts` (kept in the database). See them fail.
- [x] 1.2 `src/llm/plan-decks.ts`, fixture, `claudeDeckPlanner`, migration `deck_plans`, `src/db/plans.ts`, `GET /v1/plan`. `npm run openapi`.

## 2. Mobile
- [x] 2.1 Tests first: `__tests__/word-plan.test.tsx` (section, sizes, tap sets the pending ask and opens New words, hidden when empty or failed) and `__tests__/pending-ask.test.ts`. See them fail.
- [x] 2.2 `npm run api:gen`; `fetchPlan`; `src/new-words/pending.ts`; the section in `(tabs)/progress.tsx`; `(tabs)/index.tsx` sends the pending ask when the tab is open and Kai is quiet.
- [x] 2.3 Maestro: `e2e/flows/word-plan.yaml` (tag `my-words`, records `e2e/videos/word-plan.mp4`).

## 3. Docs
- [x] 3.1 `docs/roadmap.md` (epic 3 done), `docs/architecture.md`, `apps/server/src/llm/README.md`, the report.
