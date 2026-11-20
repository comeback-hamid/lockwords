## 1. Server
- [x] 1.1 Tests first: `test/unit/review-summary.test.ts` (streak: in a row, missed day, today empty; minutes with a long break; counts by last swipe). Run them, see them fail.
- [x] 1.2 `src/review/summary.ts` (pure).
- [x] 1.3 Tests first: `test/integration/review-undo-summary.test.ts` (undo restores the card and frees the daily limit; undo twice = `409`; summary from real events; undone events are not counted). See them fail.
- [x] 1.4 `POST /v1/review/undo` and `GET /v1/review/summary` in `src/routes/review.ts` and `src/db/review-events.ts`. `npm run openapi`.

## 2. Mobile
- [x] 2.1 Tests first: `__tests__/review-screens.test.tsx` (start with name, done screen with numbers, "Nothing to review today", loading, error) and `__tests__/review-undo-streak.test.tsx` (Undo shows the card again; streak card at half, once a day, not on day 1; speaker on the back). See them fail.
- [x] 2.2 `npm run api:gen`; `fetchSummary` and `undoSwipe` in `src/api/client.ts`; `undo` in `src/review/round-store.ts`.
- [x] 2.3 `(tabs)/review.tsx`: start screen with name and `KaiView`; done screen with new `src/components/level-chain.tsx`.
- [x] 2.4 `review/round.tsx`: Undo button, streak card, speaker on the back, mic icon (exported from Figma `Icon/16/mic`), no Close button.
- [x] 2.5 The round inside the Review tab so the tab bar stays; hidden in the first round (`(tabs)/_layout.tsx`).
- [x] 2.6 Old tests moved to the new screens, **only after Hamid's OK**: `__tests__/review.test.tsx` (done-screen text, summary call), `e2e/flows/first-run.yaml` (done-screen text).
- [x] 2.7 Maestro: `e2e/flows/review-round-screens.yaml` (tag `review`, records `e2e/videos/review-round-screens.mp4`): start with name, swipe, Undo, finish, done screen with numbers, tab bar visible.

## 3. Docs
- [x] 3.1 `docs/architecture.md` (two endpoints), `docs/product.md` 7.2 Review (undo, streak rule, no sounds in v1), `docs/roadmap.md`, `apps/mobile/CLAUDE.md`.
- [x] 3.2 Not done: the streak card on a real phone across real days, the server test covers the rule with set dates.
