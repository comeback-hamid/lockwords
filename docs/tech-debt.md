# Tech debt

Fixes that **change behavior**. Each item becomes a `fix/<name>` PR, with a failing test first.

| Date | Where | What | Why it matters | Status |
|---|---|---|---|---|
| 2026-11-16 | `apps/mobile` web | Hydration warning from `NativeTabs` on web (radix tab ids differ between server and browser). Also happens on main, not caused by our code. | Web only; iOS is first | open (check after an expo-router update) |

- **Onboarding shortcuts** (2026-11-16, onboarding-kai-deck): Kai is a still picture per pose (no animated renderer); no card or deck pictures; the composer mic does nothing (voice input comes with Speak); the real Claude call was never run against the API; only Spanish has a word test and a fixture deck.
- **The edit guard blocks changing tests when the product changes** (2026-11-16): an agent parks the old flow in `e2e/quarantine.txt` and asks Hamid. Blocked on Hamid: a standing rule for how an approved spec change may update old tests.
- **First-review shortcuts** (2026-11-16): the paywall sells nothing (RevenueCat not connected; both buttons open the app) and has no rating row or testimonials; no card pictures; this change is bigger than the ~10-task rule.
- **New words: waiting on Hamid** (2026-11-20). Hamid decided both. **Free limits:** none for now; a free user can chat and make decks with no limit. We come back to it after the whole app is built, with the paywall (`free-limits`, roadmap epic 7). **Deck pictures:** none for now; deck cards are text only. Blocked on Hamid: he says when to pick these up again.
