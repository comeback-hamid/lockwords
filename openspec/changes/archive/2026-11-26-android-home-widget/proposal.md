## Why
Lockwords now runs on Android (`android-app`, 2026-11-25). The widget is the reason people install the app, and iOS has lock screen and home screen widgets. Android needs its widget too, with the same rule. Hamid handed this over on 2026-11-25 ("build the Android home screen widget with the same rule"); no checkpoint stops.

## What Changes
- **One Android home screen widget, "Lockwords".** Hard words only. The same plan from the server as iOS: 30-minute slots, 5 looks per word, Kai's pose follows the look, a tap opens Review on that word.
- **Two looks by size:** 2 by 2 cells is the small look (HARD WORD, the word, its meaning, five green squares, Kai). Made 4 cells wide it is the medium look with the example sentence (the word in bold) and a bigger Kai.
- **Light and dark** follow the phone, with the colors of the iOS home screen widgets (Figma "Widgets", Home Screen frames).
- **The widget works while the app is closed:** it keeps the handed-over entries and shows the right one for the time.
- **The one-time screen after the first round** says how to add the widget on Android ("Hold your home screen, tap Widgets, then add Lockwords.").
- **No lock screen widget on Android:** Android phones do not have them.

Out of scope: the word's picture on the medium look (iOS has it); a preview picture in the widget list other than the widget's own layout; answering on the widget.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `widgets/mobile`: new: Android home screen widget.

## Impact
- App: new local native module `apps/mobile/modules/lockwords-widget` (Kotlin; **a new Android build**), `src/widgets/sync.android.ts`, `src/widgets/android-widget.ts`, `src/widgets/how-to.ts`, `src/app/intro/hard-words.tsx`, `scripts/gen-widget-kai.mjs`.
- Server: nothing. It uses `GET /v1/widget/plan` as it is.
- iOS: nothing changes (`src/widgets/sync.ts` stays iOS only).
- Figma: no new frames. The Android widget follows the Home Screen frames; Android's own shape (rounded card, its cell sizes) is the platform's.
- Easy mode: nothing. Other languages: right-to-left words, meanings and examples start at the right.
