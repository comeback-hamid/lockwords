## 1. Server
- [x] 1.1 Test first: `test/unit/cors.test.ts` (listed address, localhost, unknown address, preflight). See it fail.
- [x] 1.2 `hono/cors` in `src/app.ts`, `WEB_ORIGINS` in `src/env.ts`, `src/index.ts`, `.env.example`.

## 2. App
- [x] 2.1 `src/platform/key-store.ts` + `__tests__/key-store.test.ts`; the six storage users read through it.
- [x] 2.2 `src/platform/dialog.ts` + `__tests__/dialog.test.ts`; the deck page and the language screen use it.
- [x] 2.3 `kai-canvas.web.tsx` + `__tests__/kai-web.test.tsx`, `(tabs)/_layout.web.tsx`, the centered column in `_layout.tsx`, guest sign-in on the web, `tabBarClearance`, `app.json` web output `single`.
- [x] 2.4 Check by hand in the browser against the local stack (see design.md).

## 3. CI and docs
- [x] 3.1 A web build step in `.github/workflows/ci.yml`.
- [x] 3.2 `docs/roadmap.md`, `docs/architecture.md` ("Web app"), `apps/mobile/CLAUDE.md`, `docs/tech-debt.md`, the report.
