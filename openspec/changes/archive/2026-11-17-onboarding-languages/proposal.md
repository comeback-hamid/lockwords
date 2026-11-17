# Proposal

## Why

O1 and O1c list only 4 languages, a typed language is never checked, and a user can say they learn and speak the same language. Hamid's section 1 walkthrough (2026-11-17) asked for longer lists and a pop-up for a typed language we do not recognise.

Epic: roadmap **1. Onboarding + first deck**. Part a) of the four parallel onboarding PRs (a: O1–O1c languages, b: word test + estimate, c: goal + interests, d: Kai + chat + deck).

## What Changes

- O1 "What do you want to learn?" and O1c "What language do you speak?" both list the 13 languages that have engine word files, then Other: English, Spanish, French, German, Italian, Portuguese, Russian, Arabic, Persian, Turkish, Japanese, Chinese, Korean (`en es fr de it pt ru ar fa tr ja zh ko`). The screen scrolls when the list does not fit.
- O1c blocks the language picked on O1, with a plain line: "You're learning Spanish. Pick the language you already speak."
- Other (O1b, on both screens): tapping Continue asks the server to check the typed text.
  - It names one of the 13 (for example "spanish") → that listed language is picked.
  - It is a real language spelled the proper way (for example "Swedish") → it is kept with its proper English name.
  - It looks like a misspelling (for example "spansh") → a box "Did you mean Spanish?" shows with a "Yes, Spanish" button. Editing the text hides it.
  - It is not a language → a pop-up: "We didn't recognise this language. Please check the spelling or pick one from the list." with OK.
  - The check cannot be done (no network, AI down) → the typed text is kept as it is, like today. Onboarding never gets stuck on this.
- Server: new `POST /v1/languages/check` with `{ name }`. Answers `{ result, language }`. Names that match the 13 are answered without AI. Anything else goes to a new AI task `check_language` (Claude), with a fixture in tests and in local runs with no key.
- Figma V1: two new frames next to O1b: "O1b · Did you mean" and "O1b · Not recognised". `docs/screens.md` gets their links.

Suggested by me, please check:
- A failed check lets the typed text through (above). The other choice is to block with "Try again", which would stop users offline.
- The pop-up is the native iOS alert (one OK button). It needs no new part and Maestro can tap it.
- English is first on both lists (most common native language of our users is unknown; the list order is the one in your decision).

Out of scope: the word test and estimate (part b), the deck (part d), making word files for a typed language (part b), "I have an account" on O1.

Analytics events: none (PostHog comes in epic 9).

Figma (file `HSABWihDUDlsVz85aixHiT`): O1 `9:475` · O1b `37:756` · O1c `134:1542` · new frames for the two O1b states (links added when made).

Easy mode: nothing. Other languages: the point of this change. What the server gets stays the same: the code for a listed language, the proper English name for a typed one (`languageValue` in `src/onboarding/flow.ts`), so parts b and d need no change.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `onboarding/mobile`: the O1 and O1c requirement changes (13 languages, same-language block, typed-language check states).
- `onboarding/server`: adds the language check endpoint.

## Impact

- Server: new `src/routes/languages.ts`, new `src/llm/check-language.ts` (interface, Zod shape, fixture), the real call in `src/llm/claude.ts`, the 13 languages in `src/onboarding/languages.ts`, wiring in `src/app.ts` and `src/index.ts`. `openapi.json` regenerated. No new table, no migration, no new package.
- App: `src/onboarding/language-screen.tsx`, `src/app/onboarding/learning.tsx`, `speaks.tsx`, a new `src/onboarding/languages.ts`, `api.checkLanguage` in `src/api/client.ts`, `schema.ts` regenerated. No native change, no new dev build.
- Old tests I must change (your approval of this proposal is the permission):
  - `apps/mobile/__tests__/onboarding-screens.test.tsx`: the `@/auth/boot` mock gets `checkLanguage`; "Other needs text (O1b)" now mocks the check (typed "Swedish" → kept as Swedish); "O1c I speak lists English, Spanish, Persian, Arabic, Other" now checks the 13 + Other.
  - `e2e/subflows/finish-onboarding.yaml`: no change needed (Spanish and English are still on the lists). If the longer list pushes Continue off screen it is fixed in the screen, not the flow.
- E2E: new flow `e2e/flows/onboarding-languages.yaml` (tag `onboarding`), video `e2e/videos/onboarding-languages.mp4`.
