## Decisions
- **One page app (`web.output: single`), not server rendering.** Every screen needs the signed-in learner, so there is nothing useful to render ahead. It also removes the old hydration warning from the tabs.
- **Storage goes through `src/platform/key-store.ts`:** SecureStore on phones, `localStorage` in a browser. The session token in `localStorage` is the normal way for Supabase on the web. The "fresh install" clean-up is skipped on the web (a browser has no keychain that outlives the app).
- **Tabs on the web are the plain JS tab bar** (`(tabs)/_layout.web.tsx`), at the bottom, with the Figma PNG icons. The native tab bar on the web renders at the top and covered Kai. `layout.tabBarClearance` is 0 on the web because that bar does not float over the screen.
- **Kai on the web is a still pose per state** (`kai-canvas.web.tsx`, SVG files from `assets/kai`, the nearest pose when a state has none). Skia on the web needs a 3 MB WebAssembly file and a different start-up path; the live Kai can come later.
- **Pop-ups go through `src/platform/dialog.ts`:** `Alert.alert` on phones, `window.confirm` / `window.alert` in a browser (React Native's `Alert` does nothing on the web).
- **A phone-wide column (430 px) in the middle** of a wide window. No desktop layout in this change.
- **CORS:** `hono/cors` on every route. Allowed: the addresses in `WEB_ORIGINS` (comma list) and any `http://localhost` or `127.0.0.1` port. The API uses a bearer token and no cookies, so allowing localhost in the cloud gives a page nothing it could not do with a script. Headers: `Authorization`, `Content-Type`, `X-Time-Zone`.
- **Not deployed to a public address in this change.** The cloud server has the real AI key and there are no free limits yet, so a public web app is an open cost. The paywall also sells nothing. Hamid decides when; the steps are in `docs/architecture.md` ("Web app").
- **CI builds the web app** (`npx expo export -p web`) so a phone-only import that breaks the browser fails the pull request.

## Checked by hand
In the built-in browser against the local stack (2026-11-20): onboarding to the first deck, a review round with Hard and Undo, Use it with a question to Kai, the intro screens, closing the paywall, the done screen, the Progress tab (grid, meadow, plan), Your decks and a deck page.

## Not checked
Safari and Firefox; a real phone's browser; speech (the speaker button) in a browser.
