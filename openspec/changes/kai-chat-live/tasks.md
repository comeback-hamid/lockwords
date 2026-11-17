## 1. Server
- [x] 1.1 Tests first: `test/unit/kai-reply.test.ts` (name, question, language by words, generating always off-script, bad input 400, AI fails 502, no profile 200, real model call with a fake `fetch`). Run them, see them fail.
- [x] 1.2 `src/llm/kai-reply.ts` (interface, Zod shape, fixture), `claudeKaiReplier` in `src/llm/claude.ts` (Haiku 5.5, 8 s), `src/routes/kai.ts`, `src/app.ts`, `npm run openapi`. Check: server tests, typecheck, lint pass.

- Not done: Kai does not get the learner's chat name from the real database yet. `src/db/profiles.ts` does not return `name`, and part c is changing that file now. The route passes it when the store has it.
- Real model check, 2026-11-17 (Haiku 5.5): "Why do you need my name?" → off script, 2 lines; "hey, I'm Maya" → Maya; "english please" → native; while generating → off script. 1.6–2.4 s.

## 2. Mobile
- [x] 2.1 Tests first: `__tests__/kai-chat-live.test.tsx` (dots then message, options after the last bubble, Kai state map, 20 s → waiting, timed deck count 3 at 5 s and cap 9, off-script answer then the question again, name in a sentence, Kai reply fails → typed name kept, tapped option becomes the user bubble). Typing is off in Jest by default, so old tests read Kai's lines at once; `__tests__/kai-typing.test.tsx` tests the typing in both chats. Run them, see the new ones fail.
- [x] 2.2 `npm run api:gen`; `api.kaiReply` in `src/api/client.ts`. Check: api client test passes.
- [x] 2.3 Typing bubble + shared queue `useKaiTyping` (0.8–1.2 s per bubble, one after another), used by the onboarding chat and the Use it chat; Kai state from `kaiStateFor()`; back-to-question lines in `kai-script.ts`. Check: typing and state tests pass.
- [x] 2.4 Option move animation (Reanimated, Reduce Motion = no move). Check: tap test passes; looks right on the simulator.
- [x] 2.5 Talk back: typed text → `kaiReply` → on/off script; fallback. Check: talk-back tests pass.
- [x] 2.6 Deck card timed progress shared with Kai `making`. Check: progress tests pass.
- [x] 2.7 Figma: add frames "O10 · Kai typing" and "O10 · Talk back" to the V1 file; link them in `docs/screens.md`. Check: links open.
- [ ] 2.8 Maestro: `e2e/flows/kai-chat-live.yaml` (area `kai`): type a question at the name step, see Kai's answer and the question again, type the name, tap an option (it moves up), Generate, bar fills, ready. Update the waits in `e2e/subflows/finish-onboarding.yaml` and `e2e/flows/first-run.yaml`. Records `e2e/videos/kai-chat-live.mp4`. Check: full Maestro run passes; all Jest, typecheck, lint.

- Option move: built simpler than design.md said. The tapped option's bubble rises about 120 points from where the pills were, in 0.3 s (`components/chat/rise-in.tsx`), instead of measuring the pill and moving a copy. Same look in the chat, much less code. Reduce Motion: no move.
- The old pose test (`poseFor`) is unchanged: `poseFor` stays, and the screen uses the new `kaiStateFor`.
- Deck count: N − 1 for any deck size, because New words decks have 10–30 words (from the New words session, 2026-11-17).

## 3. Docs
- [ ] 3.1 `apps/mobile/CLAUDE.md` (chat queue, Kai states), `apps/server/CLAUDE.md` + `src/llm/README.md` (`kai_reply`), `docs/roadmap.md`. Check: the files say so.

## Workflow follow-up
- Hamid watches the video → `/opsx:archive` → merge main in, regenerate `openapi.json` and `schema.ts`, rerun checks → squash merge.
