## Why
Roadmap epic 8: the same app in a browser. Hamid picked "Web app" as the next thing to build (2026-11-20) and asked the agent to decide the details alone. Until now the Expo web build crashed at start (secure storage has no browser version), did not sign in, and drew no Kai.

## What Changes
- The app runs in a browser as one page app: onboarding, the three tabs, review rounds, Use it, decks and the Progress tab, against the same server.
- A guest session is made on the first visit and kept in the browser's storage.
- The tab bar is at the bottom on the web, with the same icons and the review dot. The app is shown as a phone-wide column in the middle of a wide window.
- Kai is drawn as still poses on the web (the live Skia drawing stays on phones).
- Pop-ups ("Remove this deck?", a language that is not recognised) use the browser's own dialogs.
- The server answers browser calls from the web app's address (CORS). The addresses come from the `WEB_ORIGINS` setting; any localhost port is allowed for development.
- CI builds the web app on every pull request.

Out of scope: a public address for the web app (Hamid's decision, see design.md); web payments (open decision 10); widgets; speech differences between browsers; a desktop layout.

## Capabilities
### New Capabilities
- `web/mobile`: what the app does differently in a browser.
- `web/server`: which browser addresses may call the server.
### Modified Capabilities
None.

## Impact
- App: new `src/platform/key-store.ts` and `src/platform/dialog.ts`, `src/kai/kai-canvas.web.tsx`, `src/app/(tabs)/_layout.web.tsx`; `src/app/_layout.tsx`, `src/auth/boot.ts`, `src/auth/session-storage.ts`, `src/components/icon.tsx`, `src/theme/theme.ts`, `app.json` (web output `single`). Six files read storage through the new key store.
- Server: `src/app.ts` (CORS), `src/env.ts` and `src/index.ts` (`WEB_ORIGINS`), `.env.example`.
- CI: a web build step in `.github/workflows/ci.yml`.
- Analytics events: none. Figma: none (the phone screens are reused).
- Easy mode: nothing. Other languages: nothing.
