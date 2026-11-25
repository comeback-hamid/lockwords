## Why
Hard words on the lock screen is the main promise of Lockwords (`docs/product.md` 3 and 7.4), and it is the last big part of v1 that is not built (roadmap epic 6). The spike of 2026-11-16 proved a server word can reach the lock screen. This change builds the real lock screen widgets and the rule Hamid asked for on 2026-11-25: **every word gets the chance to be seen 5 times.**

iOS never tells an app that a person looked at a widget (`docs/widget-limits.md` 8). So a "look" is a fixed time slot, not a real view.

## What Changes
- **The look rule (server).** A word is on the widget for one **slot of 30 minutes**. A word is done after **5 slots**. Slots run only from 07:00 to 23:00 on the learner's clock. Words take turns (A, B, C … then A again), up to 6 words in a group, so the 5 looks of one word are spread over the day. Hard words come first, then the most-due words. Looking never changes a word's level.
- **`GET /v1/widget/plan` (server).** Answers the list of slots for the next 48 hours: time, word, translation, hard or not, which look (1 to 5), plus the number of cards due today. The server keeps the plan it handed out and counts the slots whose time has passed.
- **The app hands the plan to the widget** (`expo-widgets`, app group) when it opens, when it comes back to the front, and after a review round. iOS only.
- **Three lock screen widgets** (Figma "Widgets", v1 frames): rectangular (word, meaning, five squares for the look, HARD mark, a one-color Kai whose pose changes with the look), circular (Kai and the number of cards due today), inline (word · meaning next to the date).
- **A tap opens the word** in the app: the address `lockwords://word/<id>` opens that word's card alone (flip, speaker, Use it, X). The circular widget opens the Review tab.
- **When the list runs out** (the app was not opened for 2 days) the widget says "New words wait · Open Lockwords".
- **O14** ("Hard words go to your lock screen") shows the widget as designed, and one line on how to add it.
- `docs/product.md` 7.4 gets the look rule. `docs/roadmap.md`, `docs/screens.md` are updated.

Out of scope: home screen widgets (next change, `home-widgets`); answering on the widget; Android; a refresh while the app is closed (background task or push); counting how many learners added the widget (`expo-widgets` cannot tell us).

## Capabilities
### New Capabilities
- `widgets/server`: the look rule and the widget plan.
- `widgets/mobile`: handing the plan to the widget, the lock screen widgets, the tap.
### Modified Capabilities
- `review/mobile`: Hard words screen (O14) shows the real widget look.

## Impact
- Server: new `src/widget/plan.ts` (pure rule), `src/db/widget.ts`, `src/routes/widget.ts`, one migration (tables `widget_plans`, `widget_looks`), one line in `src/app.ts`, `openapi.json`.
- App: **new native package `expo-widgets`** (Expo's own widget package, the one the spike used; `@expo/ui` is already installed). It adds a widget extension and an app group through its config plugin in `app.json`. **Every session needs a new dev build after this merges.** New `src/widgets/` (widget layout, plan sync), `src/app/word/[id].tsx`, `src/api/client.ts` (one function), `src/app/_layout.tsx` (start the sync), `src/components/lock-phone.tsx`, `src/app/intro/hard-words.tsx`.
- Shared files touched: `apps/server/src/app.ts`, `apps/server/src/db/schema.ts` + one migration, `openapi.json`, `apps/mobile/src/api/client.ts` and `schema.ts`, `app.json`, `docs/roadmap.md`.
- Real iPhone: the build on Hamid's phone uses a free personal Apple team. The widget needs a second app ID and an app group. Not tried yet; it may need the paid Apple Developer account (`docs/widget-limits.md` 10).
- Figma: page "Widgets", frames "v1 · …" (made 2026-11-25); components on page "Components", frame "08b Widgets v1". The old frames are kept below, marked OLD.
- Easy mode: nothing. Other languages: the word is in the learned language, the meaning in the learner's own; right-to-left text is aligned by its script.
