## Why
Kai's lines in the onboarding chat (O10–O10f) are English for everyone. A Persian speaker who learns Spanish reads English. The learner even picks a chat language on O10b, and the app saves it and ignores it. Hamid left this to the agent (2026-11-20, "decide on your own"). Decision: Kai's fixed lines are translated once per language by the server and kept. Epic 1 (Onboarding) in `docs/roadmap.md`.

## What Changes
- New `GET /v1/kai/script?native=<language>&learning=<language>`: Kai's onboarding lines and tap answers in both languages. Each language is translated once by the AI and kept in the database. English is built in.
- The onboarding chat shows Kai's lines in the learner's own language until they pick a chat language on O10b. After "own language": lines stay in their language. After "the language I learn": lines are in the learned language with the same line in their own language under it (the translation line from the New words chat).
- Tap answers follow the same language.
- If the script cannot be loaded in 4 seconds, the chat uses English, as today.

Out of scope: Kai's free answers when the learner talks back (already in the right language, `kai-chat-live`); the question screens O1–O9 (English screen text, like the rest of the app); "I have an account" and "Save progress" (wait for real sign-in, Hamid 2026-11-20).

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `kai/server`: new: Kai's onboarding script by language.
- `onboarding/mobile`: new: Kai speaks the chosen language.

## Impact
- Server: new `src/kai/script.ts` (the lines, one place), new `src/llm/translate-script.ts` with fixture and Claude version, one migration (table `kai_scripts`), `src/routes/kai.ts`, `openapi.json`.
- App: `src/onboarding/kai-script.ts` (lines come from a loaded script, English as the built-in copy), `src/app/onboarding/kai.tsx`, `src/api/client.ts`.
- Old tests: `apps/mobile/__tests__/kai-chat.test.tsx` and `kai-chat-live.test.tsx` mock the API; they need the new call in their mock only if the screen calls it for English speakers. It does not: English speakers make no call.
- Analytics events: none.
- Figma: [O10](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=239-1926) · [O10b](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=239-2010) · [O10c](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=239-2123).
- Easy mode: nothing. Other languages: this change is for them.
