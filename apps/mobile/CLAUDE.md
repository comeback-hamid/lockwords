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
- `src/kai/`: live Kai. `character-spec.json` is Kai's data (never type Kai numbers into code). `step.ts` is the port of `step()` from `docs/design/CHARACTER.html` (a worklet, tested in Jest); `kai-canvas.tsx` draws it with Skia on the UI thread; `kai.tsx` is the one component screens use: `<Kai state playKey? progress? size? onPress? />`. One-shot states (greeting, celebrate, oops…) return by themselves. Reduce Motion = still poses. Jest swaps the canvas for a plain view (`jest.setup.tsx`).
- `src/api/`: `schema.ts` is generated from `apps/server/openapi.json` (`npm run api:gen`); `client.ts` is the one place that calls the server. Never hand-write API shapes.
- Word test (O4–O7): `src/app/onboarding/word-test.tsx` (?page=A..D; the server says which page comes next, the app never knows the made-up words), `estimate.tsx` (count-up, "About level X", the "Were you guessing?" screen once). Rules: `docs/vocab-engine.md`.
- `src/app/onboarding/` + `src/onboarding/`: question screens O1–O9. Answers live in `store.ts` until O9 saves them; route rules in `flow.ts`; the "finished" flag in `finished.ts`. The tabs layout sends an unfinished user to O1.
- Shared parts: `QuestionScreen` (top bar + footer), `OptionBox`, `ButtonPrimary`, `TextField`, `Icon` (Octicons; add names in `scripts/gen-icons.mjs`, then `npm run icons:gen`), `useLoad` (load + retry).
- `src/components/chat/`: the Kai chat parts (`KaiHeader`, `ChatBubble` with `**bold**`, `TypingBubble`, `ReplyOptions`, `Composer`, `DeckCard`, `RiseIn`). Every chat screen is built from these. `src/app/onboarding/kai.tsx` is the example; Kai's lines live in `src/onboarding/kai-script.ts` (English, built in); for another language the chat loads them from the server (`api.fetchKaiScript`) and reads every line through `makeScript` (own language first, then the picked chat language, with a translation line when Kai speaks the learned language).
- Kai types in every chat: send Kai's lines through `useKaiTyping` (`components/chat/use-kai-typing.ts`): dots for 0.8–1.2 s before each Kai bubble, one after another; show reply options only when it is not `busy`. Jest has typing off (`jest.setup.tsx`); `__tests__/kai-typing.test.tsx` turns it on.
- Kai's header state comes from `kaiStateFor()` in `kai-script.ts` (greeting, listening, thinking, speaking, making, celebrate, oops, waiting). Typed text in the onboarding chat goes to `api.kaiReply` (on the script → the step's answer; off → Kai's lines, then the question again); a failed reply takes the text as the answer.
- New words: `(tabs)/index.tsx` is the chat with Kai (lines come from the server, one by one behind a typing bubble). Small rules in `src/new-words/chat.ts`. Chat parts added for it: `TranslationToggle`, `ChatBubble` with a translation line, `Composer` with `mic={false}`, `WordCard` (a single word from Kai with "Add to Random Words N"). The red dot on the Review tab is `src/review/dot.ts` (set when a word is added, cleared when Review opens). The iOS tab bar floats over the screen: a tab screen with a control at the bottom keeps `layout.tabBarClearance` under it. Kai's state there is `newWordsKaiState()` in `new-words/chat.ts` (the shared `kaiStateFor()` plus `sleeping` after 2 quiet minutes). The screen keeps its own line queue (its tests check that rule's times); a tapped option rises with `RiseIn`. Scrolling to the top loads older messages (`api.fetchKaiChat(before)`).
- Text direction: every text in a chat part is aligned by its own script with `directionStyle(text)` (`components/chat/direction.ts`): Persian, Arabic and Hebrew to the right, anything else to the left. Use it for any new text that shows a learner's or Kai's words.
- New words decks: a Kai line may have `decks`; `components/chat/deck-ideas.tsx` shows them under the bubble (three in a row to swipe with dots, one alone; only the chosen card once a deck is made). `DeckCard` has four states (`disabled` = an older idea), `showTranslation` and `inWordList`. Generate → `api.generateDeck` → `api.deckReady` (Kai says it once). The Review tab's red dot is `src/review/dot.ts` (kept on the phone, cleared when Review opens).
- A handler passed to `onPress` must not return a promise (`() => void save()`): the test library waits for it.
- Review: `(tabs)/review.tsx` (start A2 / done A9, with the server's summary) loads the round into `src/review/round-store.ts` and shows the round **inside the tab** so the tab bar stays; only the very first round opens `/review/round` full screen (Figma O12). `src/app/review/round.tsx` is both. It has Undo (last swipe, `api.undoSwipe`) and the streak card (`src/review/streak.ts`, once per review day). It walks the round (tap to flip, swipe or tap Hard / Know it / Easy); `src/app/use-it/[id].tsx` is the Use it chat: before a good sentence typed text is checked (`api.useIt`), after it typed text is a question to Kai (`api.askAboutWord`). The card back shows Use it only when the server sends `canUseIt`. After the first round only: `src/app/intro/` (hard words, trial reminder, paywall), flag in `src/review/intro.ts`. The speaker's language is kept on the phone (`src/review/speech-language.ts`).
- The paywall sells nothing yet (no RevenueCat). Both buttons open the app.
- `src/auth/`: silent guest sign-in at start (`boot.ts`), Supabase client, session kept in SecureStore (`session-storage.ts`).
- `assets/kai/`: still SVG poses, for widgets only (screens use the live `Kai`). `assets/tabs/`: tab bar icons exported from Figma as PNG (1x, 2x, 3x). Native tabs take PNG or SF Symbols, not our SVG `Icon`.
- Deck page (`src/app/deck/[id].tsx`, Figma N7): a word row slides left (`SwipeRow`, PanResponder like the review card) to show the red Delete; each row also has the accessibility action "Delete" (tests use it). "Remove deck" asks with the system pop-up, then goes back. `api.removeCard` / `api.removeDeck` answer nothing (`204`) and throw on any other answer.
- `api.generateDeck` waits for the server's background job (it reads the deck again while the status is `generating`).

## Rules
- Expo changes every SDK. Read https://docs.expo.dev/versions/v58.0.0/ and https://docs.expo.dev/llms.txt before touching an Expo API.
- `ios/` and `android/` are generated (CNG). Never create or edit them. Native setup goes in `app.json` and config plugins.
- Widgets are native SwiftUI WidgetKit, added through a config plugin.
- A native package needs a new dev build (`npm run ios`).
- RN Testing Library v14: `render` is async. Write `await render(...)`.
- Every screen test covers its states: loading, empty, error, locked.
- iOS Keychain survives deleting the app: every secure key is in `SECURE_KEYS` (`src/auth/session-storage.ts`) and is cleared on a fresh install.
- Which server the app talks to: `src/config/backend.ts`. No settings = the cloud (a release build can never point at a Mac). The local stack = the three `EXPO_PUBLIC_*` values in `.env.local` (git-ignored, written by `npm run dev:up`; names in `.env.example`); set all three or none. `npm run start:cloud` runs the dev build against the cloud even when `.env.local` exists.
