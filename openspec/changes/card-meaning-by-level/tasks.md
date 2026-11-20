## 1. Server
- [x] 1.1 Tests first: `test/unit/deck-meaning.test.ts` (the prompt asks for a meaning only in band 4; the checks drop a bad meaning and keep the card; the fixture) and a case in `test/integration/deck-meaning.test.ts` (saved, and read back by deck and by round). Run them, see them fail.
- [x] 1.2 Migration `cards.meaning`. `src/llm/make-deck.ts`, `src/llm/fixture.ts`, `src/db/decks.ts`, `src/db/cards.ts`, the two route schemas. `npm run openapi`.

## 2. Mobile
- [x] 2.1 Tests first: `__tests__/card-meaning.test.tsx` (meaning shows, translation hidden; no meaning = translation). See it fail.
- [x] 2.2 `npm run api:gen`; `src/app/review/round.tsx`.
- [x] 2.3 Maestro: `e2e/flows/card-meaning.yaml` (tag `onboarding`, records `e2e/videos/card-meaning-by-level.mp4`): an Advanced learner finishes onboarding and sees a meaning on the first card back.

## 3. Docs
- [x] 3.1 `docs/architecture.md` (column, fields), `docs/roadmap.md`.
