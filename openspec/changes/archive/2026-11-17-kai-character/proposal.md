## Why
Kai is still a set of still pictures (`apps/mobile/assets/kai/`). Hamid wants Kai to move, everywhere, with the same look and quality as `docs/design/CHARACTER.html` (walkthrough 2026-11-17: "a proper animation for each state"). The chat (change `kai-chat-live`) and O7 (part b) need these states, so Kai comes first.

Epic 1, Onboarding + first deck (roadmap row `kai-character`). This is part d, change 1 of 3: `kai-character` → `level-matched-deck` → `kai-chat-live`. One change had ~25 tasks, so it is split in three PRs.

## What Changes
- A live, drawn Kai: a port of `createCharacter()` from `docs/design/CHARACTER.html`, reading only `src/kai/character-spec.json`. Chat form only (the call form is for Speak, after v1).
- Every chat-form state in the JSON works. The ones onboarding uses are checked one by one against the HTML page: `greeting`, `idle`, `listening`, `thinking`, `speaking`, `making` (with progress), `celebrate`, `waiting`, plus `oops` for errors.
- One-shot states (`greeting`, `celebrate`, …) play once, then go to their `returnsTo` state, as the JSON says.
- The Kai header in every chat (onboarding chat, Use it chat) shows the live Kai instead of a picture.
- O2 Welcome: Kai waves (`greeting`), then rests (`idle`). Tapping Kai waves again.
- Reduce Motion on: Kai still changes pose with the state, but has no loops and no effects.
- The SVG pictures stay for widgets (a widget cannot run Skia).
- One shared component, `Kai`, for other screens: part b places it on O7 with `state="celebrate"`.

Out of scope: the call form and its morph (Speak, after v1); the mic and voice level (no voice in v1, the `speaking` mouth uses the spec's fake voice); dark mode (the app is light only today; the JSON's dark palette is kept for later); wiring chat events to states (change `kai-chat-live`).

Analytics events: none.
Easy mode: nothing. Other languages: nothing (Kai has no text).

Figma: O2 Welcome https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=9-611 · O10 https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=239-1926 (Kai header). Kai's look comes from `docs/design/CHARACTER.html`, not Figma.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `kai/mobile`: adds "Kai moves" (live drawing, states, one-shot rules, Reduce Motion) and changes "Kai chat screen parts" so the header shows the live Kai.
- `onboarding/mobile`: "O2 Welcome" gains Kai's wave.

## Impact
- New package: `@shopify/react-native-skia` (via `npx expo install`). Why: `CHARACTER.html` 11.5 names it; it draws many small moving parts on the UI thread at 60 fps. `react-native-svg` and React state per frame are too slow. **Native package → a new dev build.**
- App: new `src/kai/` (step function, drawing, `Kai` component), `src/components/chat/kai-header.tsx`, `src/app/onboarding/welcome.tsx`, `src/onboarding/kai-script.ts` (pose type moves to `src/kai/`), jest setup for Skia (`package.json`).
- Server: nothing.
- Old tests changed (needs Hamid's OK with this proposal): `apps/mobile/__tests__/kai-chat.test.tsx`, only the test "Kai’s pose follows the step" (the names now come from the character spec; the mapping itself is redone in `kai-chat-live`). No other old test.
