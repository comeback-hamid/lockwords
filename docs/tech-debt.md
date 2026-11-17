# Tech debt

Fixes that **change behavior**. Each item becomes a `fix/<name>` PR, with a failing test first.

| Date | Where | What | Why it matters | Status |
|---|---|---|---|---|
| 2026-11-16 | `apps/mobile/src/app/(tabs)/_layout.tsx` | The third tab still uses an SF Symbol. New words and Review use the Figma icons (`assets/tabs`). | Must match Figma | blocked: waits for the Speak → Progress rename (Figma V1), which brings its own icon |
| 2026-11-16 | `apps/mobile` web | Hydration warning from `NativeTabs` on web (radix tab ids differ between server and browser). Also happens on main, not caused by our code. | Web only; iOS is first | open (check after an expo-router update) |

- **Onboarding shortcuts** (2026-11-16, onboarding-kai-deck): Kai is a still picture per pose (no animated renderer); Kai's lines are English only; no card or deck pictures; the composer mic does nothing and uses a speaker icon (Octicons has no mic); the real Claude call was never run against the API; only Spanish has a word test and a fixture deck.
- **The edit guard blocks changing tests when the product changes** (2026-11-16): an agent parks the old flow in `e2e/quarantine.txt` and asks Hamid. Blocked on Hamid: a standing rule for how an approved spec change may update old tests.
- **First-review shortcuts** (2026-11-16): the paywall sells nothing (RevenueCat not connected; both buttons open the app) and has no rating row or testimonials; Use it without an AI key only checks that the word is in the sentence; no undo for "I know it"; no card pictures; the tab bar still says Speak (the Progress tab rename is in another session's uncommitted work); this change is bigger than the ~10-task rule.
