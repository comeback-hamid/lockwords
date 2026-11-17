# Tech debt

Fixes that **change behavior**. Each item becomes a `fix/<name>` PR, with a failing test first.

| Date | Where | What | Why it matters | Status |
|---|---|---|---|---|
| 2026-11-16 | `apps/mobile/src/app/(tabs)/_layout.tsx` | Tab icons are SF Symbols, not the Figma icons (`Icon/24/speak` etc.) | Must match Figma | open (first tab feature) |
| 2026-11-16 | `apps/mobile` web | Hydration warning from `NativeTabs` on web (radix tab ids differ between server and browser). Also happens on main, not caused by our code. | Web only; iOS is first | open (check after an expo-router update) |

- **Onboarding shortcuts** (2026-11-16, onboarding-kai-deck): Kai is a still picture per pose (no animated renderer); Kai's lines are English only; deck making runs inside the request with a timed progress bar; no card or deck pictures; the composer mic does nothing and uses a speaker icon (Octicons has no mic); the real Claude call was never run against the API; only Spanish has a word test and a fixture deck.
- **The edit guard blocks changing tests when the product changes** (2026-11-16): an agent parks the old flow in `e2e/quarantine.txt` and asks Hamid. Hamid said yes once (the two old flows and one test line, fixed in `fix/parked-tests`). Still open: a standing rule for how an approved spec change may update old tests. Also: `onboarding.yaml` and `first-run.yaml` repeat the steps that are now in `e2e/subflows/finish-onboarding.yaml`; switch them to `runFlow` when Hamid OKs editing them.
- **First-review shortcuts** (2026-11-16): the paywall sells nothing (RevenueCat not connected; both buttons open the app) and has no rating row or testimonials; Use it without an AI key only checks that the word is in the sentence; no undo for "I know it"; no card pictures; the speaker uses the onboarding language (default voice after a restart); the round is picked in memory on the server; the tab bar still says Speak (the Progress tab rename is in another session's uncommitted work); this change is bigger than the ~10-task rule.
