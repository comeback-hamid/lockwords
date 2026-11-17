## 1. Server
- [ ] 1.1 Tests first: `test/unit/kai-reply.test.ts` (name, question, language by words, generating always off-script, bad input 400, AI fails 502, no profile 200, real model call with a fake `fetch`). Run them, see them fail.
- [ ] 1.2 `src/llm/kai-reply.ts` (interface, Zod shape, fixture), `claudeKaiReplier` in `src/llm/claude.ts` (Haiku 5.5, 8 s), `src/routes/kai.ts`, `src/app.ts`, `npm run openapi`. Check: server tests, typecheck, lint pass.

## 2. Mobile
- [ ] 2.1 Tests first: `__tests__/kai-chat-live.test.tsx` (dots then message, options after the last bubble, Kai state map, 20 s → waiting, timed deck count 3 at 5 s and cap 9, off-script answer then the question again, name in a sentence, Kai reply fails → typed name kept, tapped option becomes the user bubble). Update the listed old tests in `kai-chat.test.tsx` to wait for typing. Run them, see the new ones fail.
- [ ] 2.2 `npm run api:gen`; `api.kaiReply` in `src/api/client.ts`. Check: api client test passes.
- [ ] 2.3 Typing bubble + chat queue; Kai state from `kaiStateFor()`; back-to-question lines in `kai-script.ts`. Check: typing and state tests pass.
- [ ] 2.4 Option move animation (Reanimated, Reduce Motion = no move). Check: tap test passes; looks right on the simulator.
- [ ] 2.5 Talk back: typed text → `kaiReply` → on/off script; fallback. Check: talk-back tests pass.
- [ ] 2.6 Deck card timed progress shared with Kai `making`. Check: progress tests pass.
- [ ] 2.7 Figma: add frames "O10 · Kai typing" and "O10 · Talk back" to the V1 file; link them in `docs/screens.md`. Check: links open.
- [ ] 2.8 Maestro: `e2e/flows/kai-chat-live.yaml` (area `kai`): type a question at the name step, see Kai's answer and the question again, type the name, tap an option (it moves up), Generate, bar fills, ready. Update `e2e/subflows/finish-onboarding.yaml` waits. Records `e2e/videos/kai-chat-live.mp4`. Check: full Maestro run passes; all Jest, typecheck, lint.

## 3. Docs
- [ ] 3.1 `apps/mobile/CLAUDE.md` (chat queue, Kai states), `apps/server/CLAUDE.md` + `src/llm/README.md` (`kai_reply`), `docs/roadmap.md`. Check: the files say so.

## Workflow follow-up
- Hamid watches the video → `/opsx:archive` → merge main in, regenerate `openapi.json` and `schema.ts`, rerun checks → squash merge.
