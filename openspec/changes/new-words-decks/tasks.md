# Tasks

## 1. Server

- [ ] 1.1 Tests first: unit tests for the `decks` part of the Kai answer (1 or 3, field limits, 2 fails), the prompt (new words left, topics, offer rules) and `current`. Integration tests for a turn with ideas (decks saved and linked), reading the chat with decks, the ready event (once, 409, 404) and `titleTranslation` on deck answers. Run them, see them fail.
- [ ] 1.2 Columns `decks.title_translation` and `kai_messages.deck_ids`, one migration.
- [ ] 1.3 `src/kai/abilities/decks.ts` (shape, prompt part, saving ideas, ready event), one line in `abilities/index.ts`, context additions. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.
- [ ] 1.4 `npm run openapi`; the openapi test passes.

## 2. Mobile

- [ ] 2.1 Tests first: deck card (translation on and off, disabled, new ready text), the ideas row (three cards, dots, one card), making (generate, ready, fails, came back later), opening the deck, the Review dot (set, kept, cleared). Run them, see them fail.
- [ ] 2.2 `npm run api:gen`; client additions (`deck_ready` event).
- [ ] 2.3 `deck-card.tsx` changes and new `components/chat/deck-ideas.tsx`.
- [ ] 2.4 The New words screen: decks under messages, making, ready event; the dot in `(tabs)/_layout.tsx`. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [ ] 2.5 Maestro flow `e2e/flows/new-words-decks.yaml` (tag `new-words`): first visit, yes, swipe the ideas, Generate, ready, the Review dot, "Let's practice" lands on Review; then ask for an own deck. Records `e2e/videos/new-words-decks.mp4`. All other flows still pass.
- [ ] 2.6 Real AI check: 10 idea sets at A1, B1 and C1 read for level, interest fit and title language. Results in the PR.

## 3. Docs

- [ ] 3.1 `docs/roadmap.md` (epic 4).

## Workflow follow-up

- Hamid answers the deck-size question, approves the spec (checkpoint 1), then the video (checkpoint 2).
