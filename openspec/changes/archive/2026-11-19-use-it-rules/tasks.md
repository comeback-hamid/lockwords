## 1. Server
- [x] 1.1 Tests first: `test/unit/use-it-rules.test.ts` (`canUseIt` by stage and on the first day; the judge's `followUp`; ask: lines, `404`, `502`, no change). Run them, see them fail.
- [x] 1.2 `followUp` in `src/llm/use-it.ts`, fixture and Claude judge. New `src/llm/ask-word.ts` (type, schema, fixture) and `claudeWordAsker` in `src/llm/claude.ts`.
- [x] 1.3 Tests first: `test/integration/use-it-rules.test.ts` (a good sentence saves one `use_it` row and moves the card once a day; not in today's round = no move; `canUseIt` from real history). See them fail.
- [x] 1.4 `src/routes/review.ts` and `src/db/cards.ts`: `canUseIt` on round cards, the once-a-day rule, `POST /v1/cards/{id}/ask`. `npm run openapi`.
- [x] 1.5 Old tests moved to the new card shape: `test/unit/review.test.ts`.

## 2. Mobile
- [x] 2.1 Tests first: `__tests__/use-it-follow-up.test.tsx` (follow-up option, typed question goes to ask, ask fails, weak sentence keeps its options) and a case in it for the card back (no Use it button when `canUseIt` is false). See them fail.
- [x] 2.2 `npm run api:gen`; `askAboutWord` in `src/api/client.ts`; the two phases in `src/app/use-it/[id].tsx`; the button rule in `src/app/review/round.tsx`.
- [x] 2.3 Old test helper gets `canUseIt`: `__tests__/review.test.tsx`.
- [x] 2.4 Maestro: `e2e/flows/use-it-rules.yaml` (tag `review`, records `e2e/videos/use-it-rules.mp4`): first round, Use it, good sentence, tap the follow-up question, Kai answers, Next card.

## 3. Docs
- [x] 3.1 `docs/product.md` 7.2 and 7.5 (Use it from Stage 3, once a day, follow-up questions), `docs/architecture.md`, `apps/server/src/llm/README.md`, `docs/roadmap.md` (epic 5).
- [x] 3.2 Not done: the real AI answers on a phone, the tests use the fixture; the cloud uses Claude.
