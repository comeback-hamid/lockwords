## Context
Builds on `lock-widgets`: same widget, same plan, same sync. Limits: `docs/widget-limits.md`.

## Decisions
- **Same widget, two more families** (`systemSmall`, `systemMedium`) so the learner finds one "Lockwords" in the widget list and picks a size.
- **Colors by `colorScheme` and `widgetRenderingMode`.** `fullColor` + light or dark = our palettes. `accented` (tinted, clear) = white content, the one-color Kai, the picture marked "desaturated".
- **The dark palette is widget-only** and lives next to the widget layout, with the Figma dark frames as its source. The app has no dark mode in v1; these values do not go into `theme.ts` as app tokens.
- **Squares:** look N fills N squares with the level greens S1 to S5, so the row gets darker as the word is seen more.
- **Pictures:** the app downloads each slot's `imageUrl` once, makes it at most 252×252 pixels as a PNG (the widget memory limit is about 30 MB and big pictures fail), and saves it in the shared folder under the card id. The timeline entry carries the file path. A missing file = the no-picture layout. Files of words no longer in the plan are deleted.
- **StandBy** shows the small widget; nothing special is built for it.
- **Mona Sans** as decided by the try in `lock-widgets` 3.2.

## Risks
- Apple's pages disagree on whether the small widget is full color or tinted on iOS 26. Both looks are designed; checked on the simulator.
