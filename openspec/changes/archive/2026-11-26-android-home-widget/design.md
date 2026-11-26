## Why native code and not `expo-widgets`
`expo-widgets` (SDK 58) has an Android side, but read from its source on 2026-11-25:
- a widget can only hold buttons that call a small JS handler; nothing can open the app with an address from a tap;
- there are no timed entries (`updateTimeline` is iOS only) and the generated widget never wakes by itself (`updatePeriodMillis="0"`).

Both are the heart of our rule (5 looks in 30-minute slots, a tap opens the word). So the Android widget is a small native module of our own.

## How it is built without touching `android/`
`apps/mobile/modules/lockwords-widget` is a local Expo module. Expo's autolinking picks up every module in `modules/`. Its own `AndroidManifest.xml` declares the widget's receiver; Android merges it into the app. No config plugin is needed and the generated project is not edited.

## Parts
- `LockwordsWidgetModule` (what JS can call): `setEntries(json)`, `shown()`, `count()`.
- `WidgetPlan` (plain Kotlin): parse the entries, pick the one for "now", say when the next one starts.
- `HardWordsWidget` (the provider): draw with `RemoteViews`, the tap's `PendingIntent`, the wake-up.
- The app sends the same entries as iOS makes (`toTimeline`), so both platforms follow one rule and the server stays the only place that decides.

## Waking
Android's own refresh (`updatePeriodMillis`) cannot be shorter than 30 minutes and is not aligned to the half hour. So the widget also sets an alarm for the start of the next entry (`AlarmManager.setWindow`, up to 2 minutes late; an exact alarm would need a permission the app should not ask for). In battery saving Android may delay it; the widget then shows the word a little longer.

## What cannot be tested by a tool
Maestro cannot read a widget on the home screen. The flow checks the app side and reads the tap address back from the native code (`shown()`), which covers the hand-over, the storage and the pick for "now". The look on a home screen (small, medium, dark) is checked by eye on the emulator.
