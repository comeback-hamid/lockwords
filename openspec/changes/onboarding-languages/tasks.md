# Tasks

## 1. Server

- [x] 1.1 Tests first: unit tests in `test/unit/languages.test.ts` for every scenario of "Check a typed language" (listed name without AI, match, suggestion, unknown, AI fails → 502, bad body → 400, no token → 401), with a fake checker; and a fixture test. Run them, see them fail.
- [x] 1.2 Add `src/onboarding/languages.ts` (13 languages), `src/llm/check-language.ts` (interface, Zod shape, fixture), the real call in `src/llm/claude.ts`, `src/routes/languages.ts`, wiring in `app.ts` and `index.ts`. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [x] 1.3 `npm run openapi`; the openapi test passes.

## 2. Mobile

- [x] 2.1 Tests first in `__tests__/onboarding-screens.test.tsx` (the three listed old tests changed, new tests for 13 + Other, the five check outcomes, busy button, same-language block). Run them, see them fail.
- [x] 2.2 `npm run api:gen`; add `api.checkLanguage`; add `src/onboarding/languages.ts`; update `language-screen.tsx`, `learning.tsx`, `speaks.tsx`. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [x] 2.3 Figma V1: frames "O1b · Did you mean" and "O1b · Not recognised" next to O1b, in the style of O1b; links in `docs/screens.md`.
- [x] 2.4 Maestro flow `e2e/flows/onboarding-languages.yaml` (tag `onboarding`): scroll the list, "spansh" → Did you mean → Spanish, "qwzx" → pop-up, O1c Spanish blocked. Records `e2e/videos/onboarding-languages.mp4`. The `onboarding` flow still passes.

Note (2.2): the "Did you mean" box closes the keyboard, or it hides behind it (found by the Maestro video).
Not done: the O1 and O1c frames in Figma still show the old 4-language list; only the two new O1b states were asked for. Waits for Hamid's word.

## 3. Docs

- [ ] 3.1 `docs/roadmap.md`: this change's line (in progress at the draft PR, merged at the end).

## Workflow follow-up

- Hamid approves the spec (checkpoint 1), then the video (checkpoint 2).
- Merge `origin/main`, regenerate `openapi.json` and `schema.ts`, rerun every check and Maestro, `/opsx:archive`, squash merge.
