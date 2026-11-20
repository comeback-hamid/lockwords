## 2. Mobile
- [x] 2.1 Tests first: `__tests__/your-decks.test.tsx` (list, counts, open, +, loading, empty, error; Progress tab numbers and button) and `__tests__/deck-words.test.tsx` (counts line, chain, filters, red mark, Known and Restore, Review this deck, Close on the round). Run them, see them fail.
- [x] 2.2 `npm run api:gen`; `fetchDecks`, `fetchProgress`, `restoreCard`, `fetchRound(deckId)` in `src/api/client.ts`.
- [x] 2.3 `src/app/decks.tsx` and `src/app/(tabs)/progress.tsx`.
- [x] 2.4 `src/app/deck/[id].tsx`: counts, chain, filters, hard mark, Restore, Review this deck. `src/app/review/round.tsx`: Close outside the first round.
- [x] 2.5 Maestro: `e2e/flows/progress-decks.yaml` (tag `my-words`, records `e2e/videos/progress-decks.mp4`).

## 3. Docs
- [x] 3.1 `docs/roadmap.md`, `apps/mobile/CLAUDE.md`, the report.
