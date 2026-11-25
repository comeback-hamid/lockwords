## Why
Roadmap epic 8 (Web app), open item "a desktop layout". On a wide screen the web app is a 430 px phone strip in the middle of an empty grey page, with the tab bar at the bottom of the strip. It reads as a phone app shown on a monitor. Hamid asked (2026-11-25) for a web app that looks right on a wide screen before it goes public.

## What Changes
Three window sizes, one app:
- **Phone, under 600 px:** as today. The app fills the window, the tab bar is at the bottom.
- **Tablet, 600 to 1023 px:** one centered column (600 px at most), the tab bar under it.
- **Desktop, 1024 px and wider:** the three tabs are a **side bar on the left** (the Lockwords mark and name, then New words, Review, Progress as rows; the open tab has a grey background; the red dot sits on Review's icon). The screen is one centered column in the rest of the window: 600 px for New words and Progress, 480 px for Review so the word card keeps a card's shape.
- **Screens outside the tabs** (onboarding, Use it, a deck page, the first round, the one-time screens after it): one centered 480 px column, on every window from 600 px up. No side bar there.
- The page behind everything is the app's own canvas color, so there is no visible strip.
- The deck ideas row in the New words chat sizes its cards from the column, not from the window.

Added after Hamid's go-ahead (2026-11-25: "apply all necessary change to make it a web friendly version, mobile web or desktop web"):
- **The keys named under the card** on a wide window (Space flip, arrows, Backspace undo).
- **A phone's browser:** finger swipes on the card, no zoom when a text box is tapped, no tap flash, no page pull.
- **A mouse:** controls answer the pointer; the card shows it can be grabbed.
- **Add to the home screen:** a manifest, icons, the page's description and colors (`apps/mobile/public/`).
- **Screen readers:** the open tab is marked as selected in the browser.

Nothing changes on the phone app.

Out of scope: a second column on Progress or a wider chat (later, if Hamid wants more use of the width); the side bar on Use it and deck pages; web payments; the public address; live Kai (`web-live-kai`).

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `web/mobile`: "The app runs in a browser" (the 430 px column rule goes) and "Tab bar on the web" (a side bar on a wide window); a new requirement for the three window sizes.

## Impact
- App: new `src/platform/web-layout.ts` (the sizes and the rules, plain functions), `src/platform/web-frame.tsx` (the page around the app), `src/platform/web-tab-bar.tsx` (the side bar form), `src/app/(tabs)/_layout.web.tsx`, `src/app/_layout.tsx` (uses `WebFrame`), `src/components/chat/deck-ideas.tsx` (one line: the width it sizes from).
- Server: nothing. CI: nothing new.
- Analytics events: none.
- Figma: new page **Web** with eight frames (captured from the built web app; W5 to W8 added and W2 replaced on 2026-11-25): W2 Review with the key names https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=2139-2 · W5 Use it ?node-id=2140-2 · W6 Deck page ?node-id=2141-2 · W7 Tablet ?node-id=2142-2 · W8 Phone browser ?node-id=2143-2. The first four as proposed:
  - W1 Desktop · New words: https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=2128-156
  - W3 Desktop · Progress: https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=2130-2
  - W4 Desktop · Onboarding: https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=2132-2
- Easy mode: nothing. Other languages: a right-to-left language keeps the side bar on the left in this change (the phone app has no mirrored layout either).
