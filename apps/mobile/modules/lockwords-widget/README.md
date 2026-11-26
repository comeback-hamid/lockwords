# lockwords-widget (Android)

The Android home screen widget: hard words, 5 looks each, a tap opens Review on that word. iOS has its own widget
(`src/widgets/lockwords-widget.tsx`, `expo-widgets`).

A local Expo module: Expo links it by itself because it lives in `apps/mobile/modules/`. Nothing in the generated
`android/` folder is edited: the receiver is declared in this module's own `AndroidManifest.xml` and Android merges it
into the app.

- `LockwordsWidgetModule.kt`: what the app can call: `setEntries(json)` hands over the plan, `shown()` and
  `count()` are for checks.
- `WidgetPlan.kt`: which entry shows at a given time (plain Kotlin, no Android).
- `HardWordsWidget.kt`: draws the widget, opens `lockwords://review?first=<id>` on a tap, and wakes at the next slot.
- `res/`: the two layouts (small, medium), colors for light and dark, Kai's poses (copies of
  `assets/widget/kai-color-*.png`, made by `npm run widget:kai`).

Why not `expo-widgets` on Android: in SDK 58 its Android widgets cannot open the app from a tap and have no timed
entries (read from its source, 2026-11-25).
