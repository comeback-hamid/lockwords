# Tasks

## 1. Server

- [x] 1.1 Tests first: integration tests for removing a card (204, deck and `wordCount` follow, 404 for another user, unknown id and a second time), removing a deck (204, then 404 everywhere, another user 404, `generating` 409, a `proposed` idea), the round, hard words, swipe and Use it after a removal, Random Words (room again, removed deck → next number, a removed word can be added again), the chat (removed deck left out, "deck ready" 404) and Kai's facts. Unit tests for the routes with fake stores and for the deck number. Run them, see them fail.
- [x] 1.2 Columns `decks.removed_at` and `cards.removed_at`, one migration (`ADD COLUMN IF NOT EXISTS`).
- [x] 1.3 `DecksStore.remove`, `CardsStore.remove`, the two routes; every reader skips removed rows (`db/decks.ts`, `db/cards.ts`, `decks/random-words.ts`, `db/kai.ts`).
- [x] 1.4 `npm run openapi`. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.

## 2. Mobile

- [x] 2.1 Tests first: the deck page (loading, error, words, the hint, Delete by the row action, the count follows, a failed delete puts the word back, the empty deck, Remove deck with Cancel and Remove, a failed removal, where the app goes after). Client tests for the two calls. Run them, see them fail.
- [x] 2.2 `npm run api:gen`; `api.removeCard` and `api.removeDeck` in `src/api/client.ts`.
- [x] 2.3 The deck page: swipe row with Delete, the hint, Remove deck with the pop-up. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [ ] 2.4 Maestro flow `e2e/flows/remove-words-and-decks.yaml` (tag `my-words`): make a deck in the chat, open it, swipe a word left, Delete, see the count fall and Review follow, then Remove deck and see Review follow. Records `e2e/videos/remove-words-and-decks.mp4`. All other flows still pass.

## 3. Docs

- [ ] 3.1 `docs/roadmap.md`, `docs/architecture.md` (removal is a mark), the app and server `CLAUDE.md` lines.
