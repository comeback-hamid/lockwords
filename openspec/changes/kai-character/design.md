## Context
`docs/design/CHARACTER.html` holds the reference renderer (`createCharacter()`, about 300 lines of JavaScript that draws SVG rectangles each frame) and section 11.5 says how to port it to React Native. `src/kai/character-spec.json` is the same JSON as on the page. Reanimated 4.7 and worklets 0.13 are already installed. The header today is an `expo-image` SVG with a "breathe" loop (`src/components/chat/kai-header.tsx`).

## Goals / Non-Goals
**Goals:** the same look and motion as the page for every chat state; 60 fps on the UI thread; no React render per frame; testable step logic.
**Non-Goals:** call form, morph, mic level, dark theme, Kai in widgets.

## Decisions
1. **Skia + a worklet step function** (as 11.5 says). `stepCharacter(spec, memory, input, timeMs)` is a pure port of the page's `step()`: local time, timelines (`keys`), loop motions, bindings, pose smoothing, blink, effects. It returns a flat list of rectangles `{x, y, w, h, color, alpha}` in spec units. A `useDerivedValue` on Skia's `useClock()` turns them into one `Picture` per frame.
   - Why not `react-native-svg` + React state: re-renders 60 times a second, too slow (the page says so).
   - Why not Rive / Lottie: they need the art redrawn in another tool, and the JSON would stop being the one source of truth.
2. **Effects** (dots, sparkle, squares, stack, `?`, `!` …) are ported from the page's `markup()` positions and CSS `@keyframes` timing as small functions of time, inside the same step.
3. **Public API** is a React component: `<Kai state progress? size? onPress? />`. `state` is any chat state name; `progress` feeds `making`. Inside, a `useSharedValue` holds the input; changing props writes the shared value, never re-creates the canvas. One-shot return (`holdMs` → `returnsTo`) runs inside the step on local time, so screens only say what happened.
4. **Pixel look:** draw with anti-alias off and whole points per unit (`u = floor(width / 28)`), as the page does, so Kai stays crisp.
5. **Tests:** the step function runs in Jest (plain JavaScript) — state returns after `holdMs`, unknown state → `idle`, `making` lights slabs by progress, Reduce Motion gives a still pose. Screens use a Jest mock of the `Kai` view (Skia does not draw in Jest). The look is checked by side-by-side screenshots (page vs simulator) in the PR.
6. **O7 (part b)** imports `Kai` from `src/kai/kai.tsx`. Until this PR is merged, part b keeps the SVG; a note in the shared notes folder tells that session the API.

## Risks / Trade-offs
- [The port drifts from the page] → port line by line, keep the page's names, compare screenshots for each onboarding state.
- [Skia adds app size (~6 MB)] → accepted: it is the renderer the design page asks for, and later screens (Progress meadow) can use it too.
- [Worklet limits: no closures over non-serialisable values] → the spec JSON is plain data; memory lives in a shared value.

## Migration Plan
New dev build after `npx expo install @shopify/react-native-skia`. Nothing on the server. Rollback = revert the PR.
