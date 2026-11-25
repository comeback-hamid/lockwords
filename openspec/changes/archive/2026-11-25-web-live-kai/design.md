## How Kai is drawn today
- Phone: `stepCharacter(memory, input, time)` in `src/kai/step.ts` returns one frame as plain rectangles (`KaiFrame`). `kai-canvas.tsx` draws that frame with Skia on the UI thread, 60 times a second.
- Browser: `kai-canvas.web.tsx` shows one still SVG per state.

## Decision: the browser's 2D canvas, not Skia
Checked on 2026-11-25:
- The Expo SDK 58 page for Skia (docs.expo.dev/versions/v58.0.0/sdk/skia) lists web as supported and says: to use Skia on the web you must follow the web installation steps "to load CanvasKit".
- In our installed package (`@shopify/react-native-skia` 2.14.0) that means: the `setup-skia-web` script copies `canvaskit.wasm` into the static files, and the app's start code waits for `LoadSkiaWeb` (or wraps each Skia view in `WithSkiaWeb`) before any Skia view can draw.
- The file `node_modules/canvaskit-wasm/bin/canvaskit.wasm` is 7.2 MB, 2.9 MB when compressed. Every first visit would download it before Kai shows on the Hello screen.
- Not checked: Skia's own web page (shopify.github.io) did not load today, so any limits it lists for Reanimated worklets on the web are unknown to this design. The phone's canvas computes each frame inside a worklet; whether that runs unchanged in a browser is an open risk of the Skia path.
- Kai is about 40 rectangles, one ellipse and sometimes one letter. The meadow is a few hundred squares. The browser's own 2D canvas draws that with no download and no start-up wait.
- `stepCharacter` is already a plain function. It runs in the browser as it is.

So the browser gets a small drawer: `drawKaiFrame(ctx, frame, unit, ox, oy)` in `src/kai/draw-2d.ts`. It is a line-by-line port of `drawFrame` in `kai-canvas.tsx` (same order: shadow, effects, text, body with lean, scale and spin, the two leaves), so both can be compared.

Trade-off: two drawers (Skia on the phone, 2D in the browser) for one step function. The part that holds all of Kai's rules (states, timing, poses) stays single. A test draws the same frame with a recording canvas and checks the calls, so the web drawer cannot drift without a red test.

## The loop
`src/platform/frame-loop.ts`: `useFrameLoop(draw, active)` calls `draw(timeMs)` on every animation frame while `active`. It stops when the browser tab is hidden (`visibilitychange`) and when the canvas is not on screen: a screen under another screen is `display: none` in the web build, which `IntersectionObserver` reports. Kai's memory is kept in a ref, so a paused Kai continues where it was, as on the phone.

Sharp pixels: the canvas is sized in device pixels (`devicePixelRatio`) and Kai's unit is a whole number of CSS pixels, as on the phone ("whole points per unit").

## The meadow
The phone's `meadow-canvas.tsx` holds the motion (grow in, wind, light band, falling leaves, specks) inside a Skia worklet. The browser needs the same numbers. To leave the phone file untouched, the motion is written again as plain functions in `src/progress/meadow-motion.ts` (`MOTION`, `meadowData(scene, rich)`, `blockAt(item, ms)`, `fallerAt`, `moteAt`), a port of the phone's code with the same constants, and `meadow-canvas.web.tsx` draws their results on a 2D canvas.
- Jest keeps using the web file (see `jest.setup.tsx`): with no real canvas (Jest) or with Reduce Motion it returns today's still SVG, so the existing tests that count blocks are not touched.
- Follow-up, not in this change: make the phone file use `meadow-motion.ts` too, so the numbers live in one place. That needs a run on a phone or simulator, which this session may not start. It is written in `docs/tech-debt.md` as blocked on a simulator run.

## Reduce Motion
The browser tells the app through the media query `prefers-reduced-motion`. React Native Web's `AccessibilityInfo.isReduceMotionEnabled()` already reads it, and `Kai` and `Meadow` already pass `still`. With `still` Kai is drawn once per state change (the step function's still pose) and the meadow is the still SVG.

## Checks
- Jest: the web drawer with a recording canvas (order of calls, colors, the leaf transforms); the frame loop (starts, stops when hidden, stops when not active); the meadow motion functions against known values (a block before its delay is not drawn, pops in with the overshoot, the top of a tree bends more than its foot, still = no motion).
- Browser (Playwright, Chromium, Firefox, WebKit): on Hello, two screenshots of Kai one second apart differ; with reduced motion they are the same; the Progress meadow moves.
- No Maestro flow: nothing changes on the phone. The video for checkpoint 2 is a screen recording of the browser.
