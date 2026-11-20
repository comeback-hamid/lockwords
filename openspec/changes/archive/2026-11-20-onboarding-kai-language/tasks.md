## 1. Server
- [x] 1.1 Tests first: `test/unit/kai-script.test.ts` (English needs no AI; keys, place holders and bold are checked; a bad answer falls back) and `test/integration/kai-script.test.ts` (kept after the first call; second call makes no AI call). Run them, see them fail.
- [x] 1.2 `src/kai/script.ts`, `src/llm/translate-script.ts` (type, schema, fixture), `claudeScriptTranslator` in `src/llm/claude.ts`, migration `kai_scripts`, `GET /v1/kai/script`. `npm run openapi`.

## 2. Mobile
- [x] 2.1 Tests first: `__tests__/kai-script-language.test.tsx` (Persian lines first; learned language + translation line after O10b; English speaker makes no call; failure and slow load = English). See them fail.
- [x] 2.2 `npm run api:gen`; `fetchKaiScript` in `src/api/client.ts`; `src/onboarding/kai-script.ts` reads lines from a script object; `src/app/onboarding/kai.tsx` loads it and adds the translation line.
- [x] 2.3 Maestro: `e2e/flows/onboarding-kai-language.yaml` (tag `onboarding`, records `e2e/videos/onboarding-kai-language.mp4`): the English flow still reads the English lines. The other-language path is covered by the screen tests (the fixture returns English).

## 3. Docs
- [x] 3.1 `docs/architecture.md`, `apps/server/src/llm/README.md`, `docs/roadmap.md` (epic 1), `docs/tech-debt.md` (the "Kai's lines are English only" note goes).
- [x] 3.2 Not done: a native-speaker check of the translated lines, it belongs to launch prep (epic 9).
