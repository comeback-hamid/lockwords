# Tasks

## 1. Server

- [x] 1.1 Tests first: unit tests for the `kai_chat` shape checks (line count, lengths, options, bad `action` dropped), the prompt builder (level, languages, first-visit and own-language rules), the context builder (profile, notes, last 20 messages, word facts), notes (save, no copies, keep 50), the 12-hour opening rule and the default translation setting. Integration tests for `GET /v1/kai/chat`, turns, opening, 409, 400, 502 (nothing saved), 429, and the translation setting. Run them, see them fail.
- [x] 1.2 Tables `kai_messages` and `kai_notes`, column `profiles.kai_translation_on`, one migration; `src/db/kai.ts`.
- [x] 1.3 `src/llm/kai-chat.ts` (interface, Zod shape, prompt, fixture) and the real call in `src/llm/claude.ts` (check the model name and call shape against the Claude API docs first).
- [x] 1.4 `src/kai/context.ts`, `src/kai/chat.ts`, `src/kai/abilities/index.ts` (empty list for changes 2 and 3), `src/routes/kai-chat.ts`, wiring in `app.ts` and `index.ts`. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.
- [x] 1.5 `npm run openapi`; the openapi test passes.

## 2. Mobile

- [x] 2.1 Tests first: bubble translation line (on, off, none), composer without mic, translation button (label, tap, saved), the screen (loading, error, first visit, send, options, no options, send failed, 429, move to Review after one second). Run them, see them fail.
- [x] 2.2 `npm run api:gen`; `api.kaiChat`, `api.kaiTurn`, `api.kaiOpen`, `api.setKaiTranslation` in `src/api/client.ts`.
- [x] 2.3 Chat parts: translation line in `chat-bubble.tsx`, `mic` switch in `composer.tsx`, translation button in `kai-header.tsx`.
- [x] 2.4 The screen `src/app/(tabs)/index.tsx` with its states, using the typing and Kai-state rules of `kai-chat-live`. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [x] 2.5 Maestro flow `e2e/flows/new-words-kai-chat.yaml` (tag `new-words`): first visit, switch translation off and on, send a message, tap "practice" and land on Review, restart and see the history. Records `e2e/videos/new-words-kai-chat.mp4`. All other flows still pass.
- [x] 2.6 Real AI check: 20 real Kai answers at A1, B1 and C1 (Spanish and one non-Latin language), read for level, length, language and translation. Results in the PR.

Notes:
- 1.3: the real call is two tries of 10 seconds (20 in all), not one try of 20. In the real-AI check about one call in ten stalled on the network of this Mac; a second try answers in time.
- 1.3: thinking is off (`between_tools`) and effort is low. A normal answer takes 2 to 5 seconds.
- 1.4: `cards.last_reviewed_at` is new (set on every swipe and good Use it), so Kai can say how much the learner practiced.
- `GET /v1/kai/chat` also returns `nativeLanguage`: the translation button shows its code ("EN").
- 2.4: the iOS tab bar floats over the screen and covered the composer (found on the simulator). The composer now sits above it (`layout.tabBarClearance`).
- 2.6: 20 real answers, three runs (Spanish A1/B1/C1, English for a Persian speaker, Persian, Japanese, German): right language and level, 1 to 3 short lines, translations right, "practice" → `review`, off-topic refused, notes saved only for new facts. Script: `apps/server/scripts/kai-try.ts`.
- Review pass (a fresh reviewer agent, 2026-11-17) found 4 spec gaps and 7 bugs; all fixed with tests: Kai is asked to open again when the tab or the app comes back; "due now" counts what Review shows (due + the new cards of a round); "I know it" counts as reviewed; one 20 second limit for the whole turn; text typed while Kai answers stays in the box; no line is lost when sending early; the composer is not reset by Kai's answer; two openings at once save one (a lock per user); a bad note never fails Kai's lines; Review does not open if the learner left the tab; a failed turn gives the options back.
- The New words screen shows the dev-only user id line (dev builds only), like the other tabs: the `guest-login` and `onboarding` flows read it on the first tab after a restart.
- Not done: moving Kai and the typing rules of `kai-chat-live` / `kai-character` (PR #18, #20 are not merged yet). The screen uses the still Kai and its own typing bubble (`typing-bubble.tsx`, `typingMs`), both marked `shortcut:` with what to switch to.
- Not done: Kai's `listening` state while the composer has text, and `waiting` after 20 quiet seconds: they come with PR #20's state rules.
- Checkpoint 2: Hamid was asleep and said to decide and merge ("Please make your own decisions", 2026-11-17). The video is `e2e/videos/new-words-kai-chat.mp4` (recorded with the real AI) for him to watch after.

## 3. Docs

- [x] 3.1 `docs/roadmap.md` (epic 4), `docs/architecture.md` (the Kai agent and its memory), `apps/server/src/llm/README.md`.

## Workflow follow-up

- Hamid approves the spec (checkpoint 1), then the video (checkpoint 2).
