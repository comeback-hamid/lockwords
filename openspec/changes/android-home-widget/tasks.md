## 1. App side
- [x] 1.1 Tests first: `__tests__/android-widget-sync.test.ts` (the plan as plain entries, the same entries as iOS, no hard words, no connection, not signed in, the how-to line per platform).
- [x] 1.2 `src/widgets/android-widget.ts`, `sync.android.ts`, `how-to.ts`; the how-to line in `src/app/intro/hard-words.tsx`.

## 2. Native widget
- [x] 2.1 Local Expo module `modules/lockwords-widget`: module, plan picking, provider, two layouts, light and dark colors, Kai's poses (`npm run widget:kai` writes them).
- [x] 2.2 `__tests__/android-widget-files.test.ts`: the pictures and colors match the iOS widget, only allowed views, the 30-minute refresh and the tap are there.

## 3. Check and docs
- [ ] 3.1 On the emulator: a new Android build; `home-widget.android.yaml`; the widget on the home screen, small and medium, light and dark, a tap opens the word.
- [x] 3.2 `docs/product.md` 7.4, `docs/architecture.md`, `apps/mobile/CLAUDE.md`, `docs/roadmap.md`.

## Notes
- Not done: the word's picture on the medium look (iOS has it). It needs the picture files handed to native code; left for a later change.
- Not done: a real Android phone. Battery saving can delay the wake-up at a slot's start.
