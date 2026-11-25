## 1. Server: the look rule and the plan
- [x] 1.1 Tests first: `test/unit/widget-plan.test.ts` (30-minute slots, day window 07:00 to 23:00 in the learner's zone, turns in a group of 6, only hard words, fewest looks first, 5 looks then the next word, a new lap, passed slots counted once, no hard words, `401` without a token) and `test/integration/widget-plan.test.ts` (the kept plan and the looks in the database, SRS untouched). Seen failing.
- [x] 1.2 `src/widget/plan.ts` (pure, `now` passed in), migration `0015` (one table, `widget_plans`: the slots handed out, the looks, counted until; the looks did not need a table of their own), `src/db/widget.ts`, `GET /v1/widget/plan` in `src/routes/widget.ts`, one line in `src/app.ts`. `npm run openapi`.
- [x] 1.3 A Hard swipe sets that word's looks to 0 (test first; no existing test changed).

## 2. App: carry the plan
- [x] 2.1 `npx expo install expo-widgets` (and `expo-asset`, already inside Expo; `@expo/ui` moved to 58.0.29 so the app and the widget package use one copy). The plugin entry in `app.json` (widget "Lockwords", two lock families, app group). New dev build on the simulator `LW New words 2`.
- [x] 2.2 Tests first: `__tests__/widget-sync.test.ts` (plan → timeline entries with look and pose, the "no hard words" entry, the last "open the app" entry, the night, nothing on web or when signed out, a failed load keeps the old timeline). Then `npm run api:gen`, `api.fetchWidgetPlan`, `src/widgets/sync.ts`, called from `src/app/_layout.tsx` on start and on return to the front, and from the Review tab every time it loads (so also after a round).

## 3. The lock screen widgets
- [x] 3.1 `src/widgets/lockwords-widget.tsx`: rectangular and inline as in Figma "Widgets" v1; Kai one-color PNG poses made by `scripts/gen-widget-kai.mjs` (`npm run widget:kai`) and copied to the shared folder by `src/widgets/kai-files.ts`.
- [ ] 3.2 Not done: Mona Sans in the widget. Why: `expo-widgets` has no setting for fonts; the font files must be put inside the widget's own small program, which needs a config plugin of ours that changes the Xcode project of that target. The lock screen widgets use the iPhone's own font (the same as the clock and the date next to them; Apple advises it there, and the inline widget cannot use another font anyway). To look at again with the home screen widgets (`home-widgets`), where our own font matters more.
- [x] 3.3 Tap: tests first, server (`test/unit/review-first.test.ts`: the card is first, due or not; another learner's, a known or a bad id is ignored) and app (`__tests__/review-from-widget.test.tsx`: the address `lockwords://review?first=<id>` opens the Review tab inside the round with that card on top; a look card has Next and no swipes; a tap while a round is open). Then both built. No existing test changed.

## 4. O14 and docs
- [x] 4.1 O14: test first (`__tests__/hard-words-widget-look.test.tsx`). `LockPhone` shows the widget look (also on O2, which uses the same part); the line "Hold your lock screen, tap Customize, then add Lockwords."; Figma: component "Lock widget" (Components, 03 Onboarding) and frame O14.
- [x] 4.2 `docs/product.md` 7.4 (the look rule), `docs/architecture.md`, `apps/mobile/CLAUDE.md`, `apps/server/CLAUDE.md`, `docs/roadmap.md`.

## 5. Check
- [ ] 5.1 On the simulator: add the two widgets to the lock screen, see a real word of the signed-in learner, move the clock 30 minutes and see the next word, tap and land in Review on that word. Screenshots in the PR. Maestro flow `e2e/flows/lock-widgets.yaml` for the app side (O14, Review from the address with the word first), video `e2e/videos/lock-widgets.mp4`.
- [ ] 5.2 Try the build on Hamid's iPhone. Write plainly what worked and what was not checked.
