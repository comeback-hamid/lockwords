# Tasks

## 1. Server

- [ ] 1.1 Tests first: unit tests for `GET /v1/kai/chat?before=` (the page before, `hasMore`, no options, 404 for a message that is not the caller's or not an id) and an integration test on the real database (120 messages, three pages, order). Run them, see them fail.
- [ ] 1.2 `KaiStore.messages(userId, limit, before?)`, `readChat(…, before?)`, the route's query. `npm run openapi`. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.

## 2. Mobile

- [ ] 2.1 Tests first (`__tests__/new-words-polish.test.tsx`): Kai's states, the tapped option, text direction on every chat part, older messages. Run them, see them fail.
- [ ] 2.2 `npm run api:gen`; `fetchKaiChat(before?)`.
- [ ] 2.3 Kai's states on the screen (`newWordsKaiState()` in `new-words/chat.ts`, built on `kaiStateFor()`).
- [ ] 2.4 The tapped option rises (`RiseIn`). The shared typing: see the decisions.
- [ ] 2.5 Text direction: `components/chat/direction.ts`, used by the bubble, the composer, the word card and the deck card.
- [ ] 2.6 Older messages on scroll to the top. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [ ] 2.7 Maestro flow `e2e/flows/new-words-polish.yaml` (tag `new-words`) with the stand-in AI. All other flows still pass.
- [ ] 2.8 Real AI check on the simulator: a profile learning Persian (native English) and one learning English (native Persian). Screenshots in the PR. Video `e2e/videos/new-words-polish.mp4`.

## 3. Docs

- [ ] 3.1 `docs/roadmap.md`, the two app guides.

## Decisions made while building (Hamid said to decide, 2026-11-19)
