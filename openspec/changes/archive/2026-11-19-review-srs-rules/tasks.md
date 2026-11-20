## 1. Server
- [x] 1.1 Tests first: `test/unit/review-day.test.ts` (review day at 23:00, 02:00, 04:00, no zone, bad zone) and `test/unit/srs-rules.test.ts` (Easy on new = stage 2, hard mark until stage 3, `again` on the first Hard). Run them, see them fail.
- [x] 1.2 `src/review/day.ts` (`reviewDay`, `endOfReviewDay`) and the new rules in `src/review/srs.ts`.
- [x] 1.3 Tests first: `test/integration/review-rules.test.ts` with the real database (daily limit of 20, due by review day, second showing after Hard, `409` for not due / double send / third swipe, one event per swipe, no event on a refused swipe). See them fail.
- [x] 1.4 Migration: table `review_events`. `src/db/review-events.ts`. The swipe and its event in one transaction in `src/db/cards.ts`.
- [x] 1.5 `src/routes/review.ts`: read `X-Time-Zone`, the round by review day and daily limit, the `409 not_due` check, `again` in the answer. `npm run openapi`.
- [x] 1.6 Old tests moved to the new rules, **only after Hamid's OK**: `test/unit/review.test.ts` (Easy on a new card: stage 1 → stage 2; swipes on cards that are not due), `test/integration/review.test.ts` (same; the "due again" step sets `due_at` in the past), `test/integration/review-round.test.ts` (the round reads the review day).

## 2. Mobile
- [x] 2.1 Tests first: `__tests__/review-again.test.tsx` (a Hard card with `again` goes to the end, "N words left" counts it) and `__tests__/api-time-zone.test.ts` (every call has `X-Time-Zone`). See them fail.
- [x] 2.2 `npm run api:gen`; `src/api/client.ts` sends the header; `src/review/round-store.ts` gets `again(card)`; `src/app/review/round.tsx` uses it.
- [x] 2.3 Maestro: new flow `e2e/flows/review-rules.yaml` (tag `review`, records `e2e/videos/review-srs-rules.mp4`): Easy shows "BACK IN 3 DAYS", a Hard card comes back at the end. `e2e/flows/first-run.yaml` gets the extra card step (**old flow, needs Hamid's OK**).

## 3. Docs
- [x] 3.1 `docs/product.md` 7.5 (Easy on a new card = Stage 2; review day; 20 new a day; Hard repeats; lock screen until Stage 3), open decision 7 closed. `docs/architecture.md` (table, header, `409`). `docs/roadmap.md`.
