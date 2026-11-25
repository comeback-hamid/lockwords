## 2. Mobile (web build only)
- [x] 2.1 Tests first, see them fail: `__tests__/kai-draw-2d.test.ts` (a recording canvas: order shadow → effects → text → body → leaves, colors and alpha, a rounded effect, nothing drawn for alpha 0), `__tests__/frame-loop.test.tsx` (runs while active, stops when hidden or not active, cleans up), `__tests__/meadow-motion.test.ts` (delay, pop in with overshoot, bend grows with height, still = no motion, falling leaves only after the trees have grown).
- [x] 2.2 `src/platform/frame-loop.ts`.
- [x] 2.3 `src/kai/draw-2d.ts` and the new `src/kai/kai-canvas.web.tsx` (live canvas; with `still` the still pose pictures stay, so the existing `kai-web.test.tsx` is green as it is). The existing `kai-web.test.tsx` checks the still poses: if it cannot stay green as it is, stop and ask Hamid (never edit an existing test).
- [x] 2.4 `src/progress/meadow-motion.ts` and the moving `src/components/meadow-canvas.web.tsx` (still SVG kept for Jest and Reduce Motion).
- [x] 2.5 Browser check in Chromium, Firefox and WebKit: Kai moves on Hello, in the chat header, on the Review start screen, on the streak card; the meadow moves; reduced motion gives still pictures; a hidden tab stops the loop. Checked 2026-11-25 with a script: on Hello two pictures a moment apart differ in all three engines and are the same with reduced motion; the Progress meadow grows in and moves. The browser video comes with the desktop layout's (one video for both changes).
- Not done: a Maestro flow. Nothing changes on the phone, and this session may not start a simulator.

## 3. Docs
- [x] 3.1 `docs/roadmap.md` (epic 8), `docs/architecture.md` ("Web app": differences from the phone), `apps/mobile/CLAUDE.md` (Web, `src/kai/`, the meadows), `docs/tech-debt.md` (the phone meadow should read `meadow-motion.ts`; blocked on a simulator run).
