## Why
Hamid's walkthrough (2026-11-17): the O10 chat must feel like a simple, normal chat. Kai types, uses emoji and some bold, the user can tap or type, a tapped option moves up into the chat, the user can talk back to Kai at any point, and making the deck shows a bar while Kai is busy building. Today every line appears at once, options just vanish, and any typed text is taken as the answer.

Epic 1, Onboarding + first deck. Part d, change 3 of 3: `kai-character` → `level-matched-deck` → **`kai-chat-live`**. Needs `kai-character` merged first (the states).

## What Changes
- **Kai types:** for each Kai bubble, three moving dots for about a second, then the whole message at once. Bubbles of one turn come one after another.
- **Tapped option moves up:** the tapped pill moves up into the chat and becomes the user's green bubble (about 0.3 s); the other pills fade out.
- **Kai's state follows the chat:** opens with `greeting`, then `idle`; `listening` while the user types; `thinking` while waiting for the server; `speaking` while the dots show; `making` with the deck's progress; `celebrate` when the deck is ready; `oops` when something fails; `waiting` after 20 seconds of nothing on the user's turn.
- **Talk back at any point:** typed text (not a tapped option) goes to a new server route, `POST /v1/kai/reply`. The AI says if it answers the current question (the name, the chat language, a topic, practice / words first) or not. If not, Kai gives one short real answer (1–2 lines), then brings the chat back to the current step with its question again. If the route fails, the typed text is taken as the answer (as today).
- **Making the deck:** the card's bar and Kai's `making` body fill together. One AI call makes all 10 words and reports no progress, so the bar is timed: about one word every 1.6 s up to 9 of 10, then 10 of 10 when the deck is ready.
- Emoji and bold: Kai's scripted lines keep them; the AI answers use them too.

Out of scope: Kai's lines in the chosen chat language (still English, as today; roadmap item); real per-word progress from the server; voice input (the mic still does nothing); other chat screens (Use it keeps its own flow, it only gets the live Kai from `kai-character`).

Analytics events: none (PostHog events come in epic 9).
Easy mode: nothing. Other languages: Kai's AI answers are in English like the script.

Figma (O10–O10f): https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=239-1926 · 239-2010 · 239-2123 · 239-2255 · 239-2369 · 239-2483. New frames to add (no design yet): "O10 · Kai typing" (dots bubble) and "O10 · Talk back" (an off-script question, Kai's answer, the question again).

## Capabilities
### New Capabilities
- `kai/server`: Kai's short AI answer to typed text in the onboarding chat (`POST /v1/kai/reply`).
### Modified Capabilities
- `kai/mobile`: adds "Kai types", "A tapped option moves up" and "Kai's state follows the chat"; changes "Deck card" (timed progress, shared with Kai).
- `onboarding/mobile`: adds "Talk back to Kai" (O10–O10f).

## Impact
- Server: new `src/llm/kai-reply.ts` (interface, Zod shape, fixture), `src/llm/claude.ts` (real call, Claude Haiku 5.5: a short answer must come fast), new `src/routes/kai.ts`, one line in `src/app.ts`, `openapi.json`.
- App: `src/components/chat/` (typing bubble and a shared Kai typing queue used by every chat screen: the onboarding chat and the Use it chat `src/app/use-it/[id].tsx`, option move, deck card progress), `src/app/onboarding/kai.tsx`, `src/onboarding/kai-script.ts` (the "back to the question" lines, the state map), `src/api/client.ts` (`kaiReply`), `src/api/schema.ts` (generated).
- Old tests changed (needs Hamid's OK with this proposal): `apps/mobile/__tests__/kai-chat.test.tsx` (the "O10–O10f Kai chat" tests wait for Kai's typing; the pose test becomes the new state map) `e2e/subflows/finish-onboarding.yaml` and `e2e/flows/first-run.yaml` (wait for typed lines). No other old test. Dots before every bubble in every chat (Hamid, 2026-11-17): typing is off in Jest by default (`jest.setup.tsx`), so the Use it tests in `review.test.tsx` do not change; `__tests__/kai-typing.test.tsx` turns it on.
