## 2. Mobile (web build only)
- [ ] 2.1 Tests first, see them fail: `__tests__/web-layout.test.ts` (sizes at 599, 600, 1023, 1024; never anything but `phone` on the phone app; column widths), `__tests__/web-side-bar.test.tsx` (rows, the open row, a tap, the dot), `__tests__/web-frame.test.tsx` (inside the tabs no column; outside a 480 column from 600 px).
- [ ] 2.2 `src/platform/web-layout.ts`.
- [ ] 2.3 `src/platform/web-frame.tsx` and its use in `src/app/_layout.tsx`.
- [ ] 2.4 The side bar form of `WebTabBar`; `(tabs)/_layout.web.tsx` (left position, scene padding, the narrower Review column).
- [ ] 2.5 `deck-ideas.tsx` sizes from `useContentWidth()` (the same number as today on the phone).
- [ ] 2.6 Browser check at 390, 820 and 1440 px in Chromium, Firefox and WebKit: the whole walk, and the four desktop pictures against Figma. Record `e2e/videos/web-desktop-layout.mp4` (a browser recording).
- Not done: a Maestro flow. Nothing changes on the phone, and this session may not start a simulator.

## 3. Docs
- [ ] 3.1 `docs/screens.md` (W1 to W4), `docs/roadmap.md`, `docs/architecture.md` ("Web app"), `apps/mobile/CLAUDE.md` (Web).
