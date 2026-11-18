## Context
`src/app/onboarding/kai.tsx` keeps a `messages` list and a `step`; `reply(text)` handles both tapped options and typed text. `ChatBubble`, `ReplyOptions`, `Composer`, `DeckCard` live in `src/components/chat/`. After `kai-character`, `KaiHeader` takes any Kai state. The server's AI calls go through `src/llm/claude.ts` with a fixture for tests (`src/llm/fixture.ts`).

## Decisions
1. **One shared typing queue for every chat** (`useKaiTyping` in `src/components/chat/`). Kai's lines go into a queue; one timer shows the dots bubble for 0.8–1.2 s (by length: 0.8 s + 8 ms per character, at most 1.2 s), then swaps in the message, then the next. The onboarding chat and the Use it chat both use it, so any later chat gets the same typing. The screen's Kai state is derived from (queue busy, waiting for server, composer has text, step, idle timer) in one pure function `kaiStateFor(...)` in `kai-script.ts`, unit-tested. Jest uses fake timers for the typing.
2. **Option move:** on tap, measure the pill (`measureInWindow`), add the user bubble hidden, and when it lays out, animate a copy of the pill from the pill's place to the bubble's place with Reanimated (300 ms, ease-out), then show the bubble. Others fade with a Reanimated `exiting` animation. Simple and no shared-element library.
3. **Off-script route on the server**, not a second LLM in the app: keys stay on the server (rule). `POST /v1/kai/reply` → `KaiReplier` interface (`src/llm/kai-reply.ts`), real one in `claude.ts`, fixture for tests and local runs: a text with "?" or more than 4 words that is not a name is off-script with a canned line; else on-script (name = last word with a capital, or the text). For `language` the fixture matches the option labels.
4. **Model: Claude Haiku 5.5 (`claude-haiku-5-5`)**, JSON output, 8 s timeout. Why not Sonnet: the user waits with Kai `thinking`; a one-line answer needs speed more than depth. The prompt asks for Kai's voice (friendly, short, emoji, bold, English) and to never change the step.
5. **Fallback:** a failed Kai reply takes the typed text as the answer, so the chat never gets stuck (O10 keeps working with the VPN off).
6. **Timed progress** lives in `DeckCard` (1.6 s per word, cap 9) and is lifted to the screen so `KaiHeader` gets the same number for `making`.

## Risks / Trade-offs
- [An AI round trip on every typed name adds ~1 s] → Kai shows `thinking`, then types; feels like a chat. Tapped options skip the call.
- [The model calls a real name off-script, or the reverse] → the prompt has examples per step; the fallback keeps the chat moving; a wrong guess only costs one extra turn.
- [Typing delays slow Maestro] → flows wait for text with `extendedWaitUntil`.
