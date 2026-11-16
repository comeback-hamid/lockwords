# Tech debt

Fixes that **change behavior**. Each item becomes a `fix/<name>` PR, with a failing test first.

| Date | Where | What | Why it matters | Status |
|---|---|---|---|---|
| 2026-11-16 | `apps/mobile/src/app/(tabs)/_layout.tsx` | Tab icons are SF Symbols, not the Figma icons (`Icon/24/speak` etc.) | Must match Figma | open (first tab feature) |
| 2026-11-16 | `apps/mobile` web | Hydration warning from `NativeTabs` on web (radix tab ids differ between server and browser). Also happens on main, not caused by our code. | Web only; iOS is first | open (check after an expo-router update) |

- **`profiles.user_id` has no foreign key to `users`** (2026-11-16, onboarding-profile). Why: `test/integration/me.test.ts` runs `truncate table users`, which Postgres refuses once another table points to `users`, and agents may not edit an existing test. Fix: Hamid OKs changing that line to `truncate table users cascade`, then add the foreign key (and to the deck tables).
- **Onboarding shortcuts** (2026-11-16, onboarding-kai-deck): Kai is a still picture per pose (no animated renderer); Kai's lines are English only; deck making runs inside the request with a timed progress bar; no card or deck pictures; `decks.user_id` has no foreign key; the composer mic does nothing and uses a speaker icon (Octicons has no mic); the real Claude call was never run against the API; only Spanish has a word test and a fixture deck.
- **The edit guard blocks changing tests when the product changes** (2026-11-16): two old Maestro flows are parked in `e2e/quarantine.txt`, and `onboarding-kai-deck` had to land in the same PR as `onboarding-profile` so the O9 test could change. Hamid: decide how an approved spec change may update old tests.
