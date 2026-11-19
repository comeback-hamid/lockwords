# Tasks

## 1. Server

- [x] 1.1 Tests first: unit tests for the `word` part of the Kai answer (four fields, limits, missing field fails), the prompt rule, and picking the target deck (none, room left, full → next number). Integration tests for a turn with a word, `addTo` and `added` on chat messages, add-word (first, twice, already known, 409, 404), a full deck, two adds at once, the card in today's round, and `kind` on deck answers. Run them, see them fail.
- [x] 1.2 Columns `decks.kind` (default `topic`) and `kai_messages.word`, one migration.
- [x] 1.3 `src/kai/abilities/words.ts` (shape, prompt part, saving), one line in `abilities/index.ts`, `src/decks/random-words.ts` (the add, in one transaction), the route. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.
- [x] 1.4 `npm run openapi`; the openapi test passes.

## 2. Mobile

- [x] 2.1 Tests first: word card (all parts, always-on meaning, speaker language), the button (name from the server, busy, Added, Already, fails, kept after restart), the Review dot. Run them, see them fail.
- [x] 2.2 `npm run api:gen`; `api.addKaiWord` in `src/api/client.ts`.
- [x] 2.3 `components/chat/word-card.tsx` and the New words screen showing it. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [ ] 2.4 Maestro flow `e2e/flows/new-words-single-words.yaml` (tag `new-words`): ask how to say a word, see the card, add it, see "Added" and the Review dot, open Review and see the word. Records `e2e/videos/new-words-single-words.mp4`. All other flows still pass.
- [ ] 2.5 Real AI check: 20 "how do I say" and "what does it mean" answers in Spanish and one non-Latin language, read for the right word, a natural example and the right translation. Results in the PR.

## 3. Docs

- [ ] 3.1 `docs/roadmap.md` (epic 4).

## Decisions made while building (not in the spec)

Hamid said on 2026-11-17 and 2026-11-18 to decide without asking. These are the choices:

- **`already` on the word.** A chat message's word has `already` next to `added`, so "Already in your words" is kept after a restart. `added` is true only when a card was really added.
- **A message with no word has no `word` field** (it is left out, not `null`). An older test checks the exact fields of a message.
- **The example may mark the word with `**`.** Kai is told to mark the word in the example in bold, so the card can color it green also when the word changes form ("llovía" for "llover"). With no marks the app looks for the word itself. The saved card's example is plain text.
- **Limits:** meaning up to 120 characters, example and its translation up to 300. Bold marks in the word, the meaning and the example's translation are taken out.
- **An "already known" answer names the deck that has the word** (`deckId`, `deckTitle`, `count` of that deck).
- **A Random Words deck** has topic and title "Random Words N" and the reason "Single words you saved." `kind` is optional in the API shape (the server always sends it) so older test data still type-checks.
- **The lock** for an add is the same per-user lock a chat turn takes.
- **Kai is told which word a card in the chat held** (the history line ends with `[word card: word = meaning]`), so "Another way to say it" has something to go on.
- **The stand-in AI** gives the card "para llevar" for "how do I say…", "cómo se dice…", "what does … mean", "qué significa…" and "otra forma…".
- **The Review dot** is built here (change 2 was not merged yet): `src/review/dot.ts`, a flag in secure storage, a badge with no number on the Review tab, cleared when Review opens. It shows only when a card was really added. Change 2 keeps one copy.
- **The Maestro flow checks Review by its count** ("11 cards to review today": the 10 of the first deck and the new word). The new word is the last card of that round, so the flow does not swipe through the other 10 to reach it. That the card is in the round is tested on the server.
- **The migration** says `ADD COLUMN IF NOT EXISTS`, so making it again after a merge is safe on the shared local databases.

## Workflow follow-up

- Hamid approves the spec (checkpoint 1), then the video (checkpoint 2).
