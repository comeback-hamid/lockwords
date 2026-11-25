## 2. Mobile (web build only)
- [x] 2.1 Tests first, see them fail: `__tests__/web-layout.test.ts` (sizes at 599, 600, 1023, 1024; never anything but `phone` on the phone app; column widths), `__tests__/web-side-bar.test.tsx` (rows, the open row, a tap, the dot), `__tests__/web-frame.test.tsx` (inside the tabs no column; outside a 480 column from 600 px).
- [x] 2.2 `src/platform/web-layout.ts`.
- [x] 2.3 `src/platform/web-frame.tsx` and its use in `src/app/_layout.tsx`.
- [x] 2.4 The side bar form of `WebTabBar`; `(tabs)/_layout.web.tsx` (left position, scene padding, the narrower Review column).
- [x] 2.5 `deck-ideas.tsx` sizes from `useContentWidth()` (the same number as today on the phone).
- [x] 2.6 Browser check at 390, 820 and 1440 px in Chromium, Firefox and WebKit: the whole walk, and the four desktop pictures against Figma. Done with the new browser tests (`e2e/web/wide.spec.ts` in three engines, `e2e/web/touch.spec.ts`). The video for Hamid is a browser recording of the wide test.
- Not done: a Maestro flow. Nothing changes on the phone, and this session may not start a simulator.

- [x] 2.7 Added after Hamid's go-ahead: `KeyHints` under the card; the page rules for a phone's browser and a mouse (`page-style.ts`); `public/index.html`, `manifest.json`, icons (`scripts/web-page.test.mjs`); `aria-selected` on the tabs (found by the wide test).

## 3. Docs
- [x] 3.1 `docs/screens.md` (W1 to W4), `docs/roadmap.md`, `docs/architecture.md` ("Web app"), `apps/mobile/CLAUDE.md` (Web).
