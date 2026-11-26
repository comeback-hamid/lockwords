## 1. Server
- [x] 1.1 Tests first (`widget-plan` tests: a slot has `example` and `imageUrl`, `imageUrl` left out when the card has no picture). Then the two fields, `npm run openapi`.

## 2. App
- [x] 2.1 Tests first: `__tests__/widget-pictures.test.ts` (saves once per picture, deletes files not in the plan, a failed download = no picture; no size limit: the server's pictures are small) and more cases in `widget-sync.test.ts` (entries carry example and picture path). See them fail.
- [x] 2.2 `src/widgets/pictures.ts`, `sync.ts`, `npm run api:gen`.
- [x] 2.3 `app.json`: add `systemSmall` and `systemMedium`. Color Kai poses from `scripts/gen-widget-kai.mjs`. New dev build.
- [x] 2.4 Small and medium layouts as in Figma: light, dark, tinted; with and without a picture; long word; "no hard words" and "open the app" entries.

## 3. Check and docs
- [ ] 3.1 On the simulator: both sizes on the home screen in light, dark and tinted, a real word and picture, the next word after 30 minutes, a tap opens the word. Screenshots in the PR, video `e2e/videos/home-widgets.mp4`.
- [ ] 3.2 `docs/product.md` 7.4, `docs/roadmap.md` (epic 6 done), `docs/screens.md`, `apps/mobile/CLAUDE.md`. Hamid's iPhone if signing allows; say plainly what was not checked.

## Notes
- Not done: our own font (Mona Sans, JetBrains Mono) in the widget. It uses the iPhone's font, like the lock screen widget. `expo-widgets` has no setting for a font file.
- Not done: a real 30-minute change watched on the home screen (the same timeline as the lock screen widget, where five looks were watched with one-minute slots).
- Not done: a real AI picture on the simulator. The local server makes stand-in pictures (a shape on grey), and those show in the medium widget.
- The server test and code of 1.1 were written together, so that test was not seen failing first.

## 4. Review fixes (2026-11-25, a second agent read the change)
- [x] 4.1 Two syncs at once: a refused download whose file is there counts as saved (test).
- [x] 4.2 The example: `~`, `[`, `]` and `\` are taken out too, so they are not read as marks (test).
- [x] 4.3 Medium widget: the small Kai sits 14 points more to the right, so a two-line example has room. Not done: looked at again on the simulator after this move (the Maestro run had reset the home screen).
- [x] 4.4 Tests: two cards with one picture; the slots really reach `savePictures`.
