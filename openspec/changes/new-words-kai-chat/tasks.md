# Tasks

## 1. Server

- [ ] 1.1 Tests first: unit tests for the `kai_chat` shape checks (line count, lengths, options, bad `action` dropped), the prompt builder (level, languages, first-visit and own-language rules), the context builder (profile, notes, last 20 messages, word facts), notes (save, no copies, keep 50), the 12-hour opening rule and the default translation setting. Integration tests for `GET /v1/kai/chat`, turns, opening, 409, 400, 502 (nothing saved), 429, and the translation setting. Run them, see them fail.
- [ ] 1.2 Tables `kai_messages` and `kai_notes`, column `profiles.kai_translation_on`, one migration; `src/db/kai.ts`.
- [ ] 1.3 `src/llm/kai-chat.ts` (interface, Zod shape, prompt, fixture) and the real call in `src/llm/claude.ts` (check the model name and call shape against the Claude API docs first).
- [ ] 1.4 `src/kai/context.ts`, `src/kai/chat.ts`, `src/kai/abilities/index.ts` (empty list for changes 2 and 3), `src/routes/kai-chat.ts`, wiring in `app.ts` and `index.ts`. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.
- [ ] 1.5 `npm run openapi`; the openapi test passes.

## 2. Mobile

- [ ] 2.1 Tests first: bubble translation line (on, off, none), composer without mic, translation button (label, tap, saved), the screen (loading, error, first visit, send, options, no options, send failed, 429, move to Review after one second). Run them, see them fail.
- [ ] 2.2 `npm run api:gen`; `api.kaiChat`, `api.kaiTurn`, `api.kaiOpen`, `api.setKaiTranslation` in `src/api/client.ts`.
- [ ] 2.3 Chat parts: translation line in `chat-bubble.tsx`, `mic` switch in `composer.tsx`, translation button in `kai-header.tsx`.
- [ ] 2.4 The screen `src/app/(tabs)/index.tsx` with its states, using the typing and Kai-state rules of `kai-chat-live`. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [ ] 2.5 Maestro flow `e2e/flows/new-words-kai-chat.yaml` (tag `new-words`): first visit, switch translation off and on, send a message, tap "practice" and land on Review, restart and see the history. Records `e2e/videos/new-words-kai-chat.mp4`. All other flows still pass.
- [ ] 2.6 Real AI check: 20 real Kai answers at A1, B1 and C1 (Spanish and one non-Latin language), read for level, length, language and translation. Results in the PR.

## 3. Docs

- [ ] 3.1 `docs/roadmap.md` (epic 4), `docs/architecture.md` (the Kai agent and its memory), `apps/server/src/llm/README.md`.

## Workflow follow-up

- Hamid approves the spec (checkpoint 1), then the video (checkpoint 2).
