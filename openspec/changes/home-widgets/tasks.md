## 1. Server
- [ ] 1.1 Tests first (`widget-plan` tests: a slot has `example` and `imageUrl`, `imageUrl` left out when the card has no picture). Then the two fields, `npm run openapi`.

## 2. App
- [ ] 2.1 Tests first: `__tests__/widget-pictures.test.ts` (saves once per card, the size limit, deletes files not in the plan, a failed download = no picture) and more cases in `widget-sync.test.ts` (entries carry example and picture path). See them fail.
- [ ] 2.2 `src/widgets/pictures.ts`, `sync.ts`, `npm run api:gen`.
- [ ] 2.3 `app.json`: add `systemSmall` and `systemMedium`. Color Kai poses from `scripts/gen-widget-kai.mjs`. New dev build.
- [ ] 2.4 Small and medium layouts as in Figma: light, dark, tinted; with and without a picture; long word; "open the app" entry.

## 3. Check and docs
- [ ] 3.1 On the simulator: both sizes on the home screen in light, dark and tinted, a real word and picture, the next word after 30 minutes, a tap opens the word. Screenshots in the PR, video `e2e/videos/home-widgets.mp4`.
- [ ] 3.2 `docs/product.md` 7.4, `docs/roadmap.md` (epic 6 done), `docs/screens.md`, `apps/mobile/CLAUDE.md`. Hamid's iPhone if signing allows; say plainly what was not checked.
