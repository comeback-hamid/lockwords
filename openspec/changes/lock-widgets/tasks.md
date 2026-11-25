## 1. Server: the look rule and the plan
- [ ] 1.1 Tests first: `test/unit/widget-plan.test.ts` (30-minute slots, day window 07:00 to 23:00 in the learner's zone, turns in a group of 6, hard first, then most due, then new, 5 looks then the next word, a new lap, passed slots counted once, known and removed words left out, no words) and `test/integration/widget-plan.test.ts` (the kept plan and the looks in the database, `401` without a token). See them fail.
- [ ] 1.2 `src/widget/plan.ts` (pure, `now` passed in), migration (`widget_plans`, `widget_looks`), `src/db/widget.ts`, `GET /v1/widget/plan` in `src/routes/widget.ts`, one line in `src/app.ts`. `npm run openapi`.
- [ ] 1.3 A Hard swipe sets that word's looks to 0 (test first, in `widget-plan` tests; no existing test changes).

## 2. App: carry the plan
- [ ] 2.1 `npx expo install expo-widgets`; the plugin entry in `app.json` (widget "Lockwords", three lock families, app group). New dev build on the simulator `LW New words 2`.
- [ ] 2.2 Tests first: `__tests__/widget-sync.test.ts` (plan → timeline entries with look and pose, the last "open the app" entry, nothing on web or when signed out, a failed load keeps the old timeline). Then `npm run api:gen`, `api.fetchWidgetPlan`, `src/widgets/sync.ts`, called from `src/app/_layout.tsx` on start, on return to the front, and after a round.

## 3. The lock screen widgets
- [ ] 3.1 `src/widgets/lockwords-widget.tsx`: rectangular, circular, inline as in Figma "Widgets" v1; Kai one-color PNG poses made by `scripts/gen-widget-kai.mjs` and copied to the shared folder.
- [ ] 3.2 Try Mona Sans in the extension (own config plugin `plugins/with-widget-fonts.js`). Write the result here; fall back to the system font if it fails.
- [ ] 3.3 Tap: tests first for `src/app/word/[id].tsx` (loading, error, the card, X goes to the tabs), then the screen and the `lockwords://word/<id>` and `lockwords://review` addresses.

## 4. O14 and docs
- [ ] 4.1 O14: test first (the phone shows the widget look: word, meaning, five squares; the line "Hold your lock screen, tap Customize, add Lockwords"). Update `LockPhone`, the Figma frame O14 and `docs/screens.md`.
- [ ] 4.2 `docs/product.md` 7.4 (the look rule), `docs/roadmap.md`, `docs/architecture.md`, `apps/mobile/CLAUDE.md`.

## 5. Check
- [ ] 5.1 On the simulator: add the three widgets to the lock screen, see a real word of the signed-in learner, move the clock 30 minutes and see the next word, tap and land on the word. Screenshots in the PR. Maestro flow `e2e/flows/lock-widgets.yaml` for the app side (O14, the word screen from the address), video `e2e/videos/lock-widgets.mp4`.
- [ ] 5.2 Try the build on Hamid's iPhone. Write plainly what worked and what was not checked.
