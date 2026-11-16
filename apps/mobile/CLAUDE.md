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
- `src/app/`: screens only (Expo Router). `(tabs)/`: New words · Review · Speak. My words is a top-bar button, not a tab.
- `src/components/`: shared UI. Copy Figma component names (Chat bubble, Reply option, Composer, Kai header, Level square…).
- `src/theme/theme.ts`: all tokens from Figma. No raw colors or sizes anywhere else.
- `src/theme/fonts.ts`: the fonts loaded at start (Mona Sans 400/500/600, JetBrains Mono 500/700). Use `type.*` styles; never set `fontWeight` (the weight is in the font name).
- `src/kai/character-spec.json`: Kai's data. Never type Kai numbers into code. Port `createCharacter()` from `docs/design/CHARACTER.html` (Skia on the phone).
- `src/api/` (added with the first server call): generated from the server's OpenAPI. Never hand-write API shapes.
- `assets/kai/`: still SVG poses for widgets.

## Rules
- Expo changes every SDK. Read https://docs.expo.dev/versions/v58.0.0/ and https://docs.expo.dev/llms.txt before touching an Expo API.
- `ios/` and `android/` are generated (CNG). Never create or edit them. Native setup goes in `app.json` and config plugins.
- Widgets are native SwiftUI WidgetKit, added through a config plugin.
- A native package needs a new dev build (`npm run ios`).
- RN Testing Library v14: `render` is async. Write `await render(...)`.
- Every screen test covers its states: loading, empty, error, locked.
- iOS Keychain survives deleting the app: list every secure key in one `SECURE_KEYS` list and clear them on a fresh install.
