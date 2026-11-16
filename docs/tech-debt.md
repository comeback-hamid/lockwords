# Tech debt

Fixes that **change behavior**. Each item becomes a `fix/<name>` PR, with a failing test first.

| Date | Where | What | Why it matters | Status |
|---|---|---|---|---|
| 2026-11-16 | `apps/mobile/src/app/(tabs)/_layout.tsx` | Tab icons are SF Symbols, not the Figma icons (`Icon/24/speak` etc.) | Must match Figma | open (first tab feature) |
| 2026-11-16 | `apps/mobile` web | Hydration warning from `NativeTabs` on web (radix tab ids differ between server and browser). Also happens on main, not caused by our code. | Web only; iOS is first | open (check after an expo-router update) |

- **`profiles.user_id` has no foreign key to `users`** (2026-11-16, onboarding-profile). Why: `test/integration/me.test.ts` runs `truncate table users`, which Postgres refuses once another table points to `users`, and agents may not edit an existing test. Fix: Hamid OKs changing that line to `truncate table users cascade`, then add the foreign key (and to the deck tables).
