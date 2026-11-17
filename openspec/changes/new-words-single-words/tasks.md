# Tasks

## 1. Server

- [ ] 1.1 Tests first: unit tests for the `word` part of the Kai answer (four fields, limits, missing field fails), the prompt rule, and picking the target deck (none, room left, full → next number). Integration tests for a turn with a word, `addTo` and `added` on chat messages, add-word (first, twice, already known, 409, 404), a full deck, two adds at once, the card in today's round, and `kind` on deck answers. Run them, see them fail.
- [ ] 1.2 Columns `decks.kind` (default `topic`) and `kai_messages.word`, one migration.
- [ ] 1.3 `src/kai/abilities/words.ts` (shape, prompt part, saving), one line in `abilities/index.ts`, `src/decks/random-words.ts` (the add, in one transaction), the route. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.
- [ ] 1.4 `npm run openapi`; the openapi test passes.

## 2. Mobile

- [ ] 2.1 Tests first: word card (all parts, always-on meaning, speaker language), the button (name from the server, busy, Added, Already, fails, kept after restart), the Review dot. Run them, see them fail.
- [ ] 2.2 `npm run api:gen`; `api.addKaiWord` in `src/api/client.ts`.
- [ ] 2.3 `components/chat/word-card.tsx` and the New words screen showing it. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [ ] 2.4 Maestro flow `e2e/flows/new-words-single-words.yaml` (tag `new-words`): ask how to say a word, see the card, add it, see "Added" and the Review dot, open Review and see the word. Records `e2e/videos/new-words-single-words.mp4`. All other flows still pass.
- [ ] 2.5 Real AI check: 20 "how do I say" and "what does it mean" answers in Spanish and one non-Latin language, read for the right word, a natural example and the right translation. Results in the PR.

## 3. Docs

- [ ] 3.1 `docs/roadmap.md` (epic 4).

## Workflow follow-up

- Hamid approves the spec (checkpoint 1), then the video (checkpoint 2).
