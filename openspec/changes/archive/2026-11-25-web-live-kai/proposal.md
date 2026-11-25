## Why
Roadmap epic 8 (Web app), open item "live Kai on the web". In a browser Kai is a still picture and the meadow on Progress does not move. On the phone Kai waves, talks, listens and thinks, and the meadow grows in and moves in the wind. A web visitor meets a Kai that looks switched off. Hamid asked (2026-11-25) to bring the web app up to the phone app before it goes public.

## What Changes
- Kai moves in a browser exactly as on the phone: the same states, the same timing, the same one-shot states that return by themselves, the same `talking` and `listening`. It is drawn from the same data (`character-spec.json`) by the same step function (`src/kai/step.ts`); only the last step, putting rectangles on the screen, is new for the browser.
- The meadow on Progress grows in and moves in the wind in a browser, as on the phone.
- Reduce Motion in the browser (the system setting "reduce motion") gives a still Kai and a still meadow, as on the phone.
- A Kai or meadow that is not on screen (a hidden tab of the browser, a screen under another screen) does not draw.
- **No Skia in the browser.** The browser's own 2D canvas draws both. Skia's web build needs an extra download (CanvasKit, 2.9 MB compressed) before Kai could show; the 2D canvas needs none. See design.md.

Out of scope: any change on the phone; new Kai states or drawings; sound; the desktop layout (its own change, `web-desktop-layout`); the public address.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `web/mobile`: "Kai on the web" changes from a still pose to a moving Kai; a new requirement for the meadow on the web.

## Impact
- App: `src/kai/kai-canvas.web.tsx` (rewritten), new `src/kai/draw-2d.ts` (draws one Kai frame on a 2D canvas), `src/components/meadow-canvas.web.tsx` (a moving canvas in the browser, the still picture stays for Jest and Reduce Motion), new `src/progress/meadow-motion.ts` (the meadow's motion numbers and per-frame positions as plain functions, used by the browser), new `src/platform/frame-loop.ts` (one animation loop that stops when hidden).
- The phone's files `kai-canvas.tsx` and `meadow-canvas.tsx` are **not changed**.
- Server: nothing. CI: nothing new (the web build step already runs).
- Analytics events: none.
- Figma: none. Kai and the meadow look as in Figma "Character" and Progress P1; this change only makes them move as they already do on the phone.
- Easy mode: nothing. Other languages: nothing.
