## 2. Mobile
- [x] 2.1 Tests first: `__tests__/kai-step.test.ts` (greeting → idle after 2 s, celebrate → idle after 2.4 s, unknown state → idle, `making` at 0.5 lights about half the slabs, Reduce Motion = still pose, blink happens) and `__tests__/kai-view.test.tsx` (header and O2 show "Kai"; tapping Kai on O2 sets `greeting`). Run them, see them fail.
- [x] 2.2 `npx expo install @shopify/react-native-skia`; Jest setup for Skia in `package.json`; new dev build on iPhone 17 Pro Max. Check: `npx expo-doctor` passes, the app opens.
- [x] 2.3 Port `step()` and the effects from `CHARACTER.html` to `src/kai/step.ts` (worklet, reads only the JSON). Check: 2.1 step tests pass.
- [x] 2.4 `src/kai/kai.tsx`: the `Kai` component (Skia canvas, shared-value input, `progress`, `onPress`, Reduce Motion). Check: 2.1 view tests pass.
- [x] 2.5 Kai header uses `Kai`; O2 Welcome waves and waves again on tap; the pose type moves to `src/kai/`. Check: all Jest tests, typecheck, lint.
- [ ] 2.6 Side-by-side screenshots (page vs simulator) for `greeting`, `idle`, `listening`, `thinking`, `speaking`, `making`, `celebrate`, `waiting`, `oops`; fix any difference. Check: screenshots in the PR.
- [ ] 2.7 Maestro flow `e2e/flows/kai-character.yaml` (area `kai`): O2 shows Kai, tap Kai, go on to the chat; records `e2e/videos/kai-character.mp4`. Check: `npm run e2e -- --areas kai` passes, and the full run passes.

- Not done: effects for states the onboarding does not use yet (zzz, rain, tree, plant, toss, idea, note, heart, lines, scan, levelup, star). Those states still move, without their effect. Each comes with the screen that first uses it.
- Not done: the call form, the morph and the dark theme (non-goals in design.md).

## 3. Docs
- [x] 3.1 `apps/mobile/CLAUDE.md` (Kai layer), `docs/roadmap.md` (`kai-character` row), a note for part b in the shared notes folder. Check: roadmap row says 🟨 / ✅.

## Workflow follow-up
- Hamid watches the video → `/opsx:archive` → merge main in, rerun checks → squash merge.
