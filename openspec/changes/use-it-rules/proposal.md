## Why
Use it was built from guesses: it shows on every card, a word can go up many levels in one minute, and anything typed after the feedback is checked as a new sentence. Figma A6c also has a follow-up question to Kai that the app does not have. Hamid's answers (2026-11-20): Use it from Stage 3 on normal days and always in the first onboarding round; a good sentence moves a word up once per day; build follow-up questions, and they never change the level. Epic 5 (Use it) in `docs/roadmap.md`. Builds on `review-srs-rules`.

## What Changes
- **When Use it shows.** Each card in today's round gets `canUseIt`. It is true from Stage 3, and for every card on the learner's first review day (the onboarding practice). The card back shows the Use it button only then.
- **Counts once a day.** A good sentence counts like an Easy swipe, once per card per review day, and only for a card that is in today's round. It is saved in `review_events` as `use_it`. A second good sentence the same day gets the feedback but no level.
- **Follow-up questions.** New `POST /v1/cards/{id}/ask`: Kai answers a question about the word in 1 to 3 short lines. The Use it answer brings one suggested question (for example "Why “le”?"). After the feedback, typed text is a question, not a new sentence.
- **After a weak sentence** the options "Show me an example" and "Skip this word" stay.

Out of scope: voice input (the mic in the text box still does nothing; Speak is after v1); weekly free limit on Use it (Hamid: no free limits for now).

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `use-it/server`: Check a sentence; new: Ask about a word.
- `use-it/mobile`: Checking a sentence; new: Follow-up questions.
- `review/server`: Today's round (the `canUseIt` field).
- `review/mobile`: new: Use it only when offered.

## Impact
- Server: `src/routes/review.ts`, `src/llm/use-it.ts` (the judge also returns `followUp`), new `src/llm/ask-word.ts` with a fixture and the Claude version in `src/llm/claude.ts`, `src/db/cards.ts`, `openapi.json`.
- App: `src/app/use-it/[id].tsx`, `src/app/review/round.tsx`, `src/api/client.ts`.
- **Old tests change** (rule change): `apps/server/test/unit/review.test.ts` (the round's card fields), `apps/mobile/__tests__/review.test.tsx` (the card type gets `canUseIt`).
- Analytics events: none.
- Figma: [A6](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=261-1191) · [A6b](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=261-1296) · [A6c](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=261-1402) · [O13](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=280-2179).
- Easy mode: nothing. Other languages: Kai answers in the learner's own language for A1 and A2, as the feedback does today.
