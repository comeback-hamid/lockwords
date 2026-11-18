# apps/mobile

Expo SDK 58, React Native 0.88, TypeScript strict, Expo Router (routes in `src/app/`). iOS first, then Android and web.

## Commands (run from this folder)
```bash
npx expo install <package>   # ALWAYS, never npm install here
npm run ios                  # dev build on the iOS simulator (npx expo run:ios)
npm start                    # dev server for an existing dev build
npm test                     # Jest + React Native Testing Library
npm run typecheck            # tsc --noEmit
npm run lint                 # expo lint
npx expo-doctor              # dependency and config check
```
Maestro flows run from the repo root: `npm run e2e -- --areas review`.

## Layers
- `src/app/`: screens only (Expo Router). `(tabs)/`: New words · Review · Progress (v1, decided 2026-11-16). Progress = the My words page as a tab. Speak comes after v1.
- `src/components/`: shared UI. Copy Figma component names (Chat bubble, Reply option, Composer, Kai header, Level square…).
- `src/theme/theme.ts`: all tokens from Figma. No raw colors or sizes anywhere else.
- `src/theme/fonts.ts`: the fonts loaded at start (Mona Sans 400/500/600, JetBrains Mono 500/700). Use `type.*` styles; never set `fontWeight` (the weight is in the font name).
- `src/kai/character-spec.json`: Kai's data. Never type Kai numbers into code. Port `createCharacter()` from `docs/design/CHARACTER.html` (Skia on the phone).
- `src/api/`: `schema.ts` is generated from `apps/server/openapi.json` (`npm run api:gen`); `client.ts` is the one place that calls the server. Never hand-write API shapes.
- Word test (O4–O7): `src/app/onboarding/word-test.tsx` (?page=A..D; the server says which page comes next, the app never knows the made-up words), `estimate.tsx` (count-up, "About level X", the "Were you guessing?" screen once). Rules: `docs/vocab-engine.md`.
- `src/app/onboarding/` + `src/onboarding/`: question screens O1–O9. Answers live in `store.ts` until O9 saves them; route rules in `flow.ts`; the "finished" flag in `finished.ts`. The tabs layout sends an unfinished user to O1.
- Shared parts: `QuestionScreen` (top bar + footer), `OptionBox`, `ButtonPrimary`, `TextField`, `Icon` (Octicons; add names in `scripts/gen-icons.mjs`, then `npm run icons:gen`), `useLoad` (load + retry).
- `src/components/chat/`: the Kai chat parts (`KaiHeader`, `ChatBubble` with `**bold**`, `ReplyOptions`, `Composer`, `DeckCard`). Every chat screen is built from these. `src/app/onboarding/kai.tsx` is the example; Kai's lines live in `src/onboarding/kai-script.ts`.
- A handler passed to `onPress` must not return a promise (`() => void save()`): the test library waits for it.
- Review: `(tabs)/review.tsx` (start / all done) loads the round into `src/review/round-store.ts`; `src/app/review/round.tsx` walks it (tap to flip, swipe or tap Hard / Know it / Easy); `src/app/use-it/[id].tsx` is the Use it chat. After the first round only: `src/app/intro/` (hard words, trial reminder, paywall), flag in `src/review/intro.ts`. The speaker's language is kept on the phone (`src/review/speech-language.ts`).
- The paywall sells nothing yet (no RevenueCat). Both buttons open the app.
- `src/auth/`: silent guest sign-in at start (`boot.ts`), Supabase client, session kept in SecureStore (`session-storage.ts`).
- `assets/kai/`: still SVG poses for widgets. `assets/tabs/`: tab bar icons exported from Figma as PNG (1x, 2x, 3x). Native tabs take PNG or SF Symbols, not our SVG `Icon`.
- `api.generateDeck` waits for the server's background job (it reads the deck again while the status is `generating`).

## Rules
- Expo changes every SDK. Read https://docs.expo.dev/versions/v58.0.0/ and https://docs.expo.dev/llms.txt before touching an Expo API.
- `ios/` and `android/` are generated (CNG). Never create or edit them. Native setup goes in `app.json` and config plugins.
- Widgets are native SwiftUI WidgetKit, added through a config plugin.
- A native package needs a new dev build (`npm run ios`).
- RN Testing Library v14: `render` is async. Write `await render(...)`.
- Every screen test covers its states: loading, empty, error, locked.
- iOS Keychain survives deleting the app: every secure key is in `SECURE_KEYS` (`src/auth/session-storage.ts`) and is cleared on a fresh install.
- Env values: `.env.local` (git-ignored, written by `npm run dev:up`); names in `.env.example`.
