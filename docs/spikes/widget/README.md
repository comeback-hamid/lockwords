# Widget spike (2026-11-16)

**Question:** can one word from our server reach the iPhone lock screen, using Expo (CNG, no hand-made `ios/` folder)?
**Answer: yes.** Tested on the iOS 26.5 simulator (iPhone 17).

This branch is a test. **Do not merge.** The real widgets are built later (roadmap epic 6, `lock-widgets`), after the app skeleton.

## What was built
- Server: `GET /spike/word` returns one fixed word (`apps/server/src/routes/spike-word.ts`).
- App: on start, fetches that word and calls `LockWord.updateSnapshot(...)` (`apps/mobile/src/widgets/sync-lock-word.ts`).
- Widget: `apps/mobile/src/widgets/lock-word-widget.tsx`, made with **`expo-widgets` 58.0.28** + **`@expo/ui`** (Expo's own package; JSX that becomes SwiftUI WidgetKit). Families: lock-screen rectangular + inline, home small.
- Config: one plugin entry in `app.json`. Prebuild made the `ExpoWidgetsTarget` extension and the App Group `group.com.comebackhamid.lockwords` by itself.

## Proof
1. Widget added to the lock screen shows the server word "la mariposa / the butterfly" (`1-mariposa.png`).
2. Changed the server word to "el gato", opened the app once, locked the phone: the widget shows "el gato / the cat" (`2-gato-after-server-change.png`).

## What we learned (for the real `lock-widgets` change)
- `expo-widgets` is enough. No need for `@bacons/apple-targets` or hand-written Swift. It still fits the dev guide rule: "native WidgetKit, added through a config plugin, never by hand".
- The widget code runs in its own small runtime: no hooks, no fetch, no imports, no top-level constants. **All data comes from the app** through `updateSnapshot` / `updateTimeline`. So the widget shows "the last words it got", as the dev guide says.
- For "hard words through the day", use `updateTimeline` with several entries (one word per hour), set when the app opens or after a review.
- Lock-screen widgets are drawn in "vibrant" mode: iOS makes them one color. Our green colors will not show there. Only size and weight matter.
- Fonts: the widget uses the system font. Mona Sans in the widget needs the font files inside the extension. Not tested.
- Pictures (Kai poses) must be written to `widgetsDirectory` by the app. Not tested.
- The widget needs one new dev build. After that, word changes need no new build.
- Not tested: a real iPhone (needs the Apple team ID + App Group on the Apple account), App Store review, Android.
