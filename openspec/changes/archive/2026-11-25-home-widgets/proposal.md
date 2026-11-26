## Why
`docs/product.md` 7.4 promises home screen widgets in v1: small and medium, full color, see and open only. The lock screen widgets (`lock-widgets`) bring the plan, the look rule and the tap. This change adds the two home screen sizes on top. It starts after `lock-widgets` is merged (merged 2026-11-25; Hamid then said: decide yourself, no approval stops).

## What Changes
- **Small widget (158×158):** the label HARD WORD in red, the word, its meaning, five squares for the look (each look a darker green, like the level squares), and Kai in color in the corner with the pose of the look.
- **Medium widget (338×158):** the same, plus the example sentence with the word in bold, and the word's picture on the right with a small Kai at its corner. A word with no picture shows a big Kai on a ground line instead.
- **Light and dark:** the widgets follow the phone. Dark uses dark greens and a near-black card (the app itself stays light in v1).
- **Tinted and clear home screens (iOS 18 and 26):** iOS removes our colors. The widget then uses the one-color Kai and a faded picture.
- **The plan carries what the medium widget needs:** `example` and `imageUrl` per slot. The app saves each picture as a file in the shared widget folder (as it is: the server's pictures are small).
- The same tap as the lock widgets: Review opens with that word first. Hard words only, like the lock widgets.

Out of scope: a large widget; buttons on the widget (after v1); the "words due" widget of the old Figma frame.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `widgets/server`: the plan's slots also have `example` and `imageUrl`.
- `widgets/mobile`: new: Home screen widgets; pictures for the widget.

## Impact
- Server: `src/routes/widget.ts`, `src/widget/plan.ts` (two more fields), `openapi.json`. No migration.
- App: `app.json` (two more families on the same widget; **a new dev build**), `src/widgets/lockwords-widget.tsx`, `src/widgets/sync.ts`, new `src/widgets/pictures.ts`, `scripts/gen-widget-kai.mjs` (color poses).
- Figma: page "Widgets", v1 frames "Home Screen · light", "· dark", "· tinted", "Story · one word, five looks", "Story · medium widget states".
- Easy mode: nothing. Other languages: right-to-left meanings and examples are aligned to the right.
