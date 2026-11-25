## Context
Limits: `docs/widget-limits.md`. The widget code (`expo-widgets`) has no network, no timers and no imports; it only draws the props of the current timeline entry. So the server makes the plan, the app carries it, the widget shows it.

## Decisions
- **A look is a 30-minute slot. Why 30:** a day has 16 waking hours = 32 slots. With 5 looks per word that is about 6 words a day, which fits a learner who gets 10 to 30 new words per deck and a few hard words a day. With 60 minutes only 3 words a day would get their looks, and a hard word would wait days for its turn. Shorter than 30 minutes and a word would often change before the person looked at the phone even once. 30 is the low end of Hamid's range (30 to 60); it is one constant on the server (`SLOT_MINUTES`), easy to change.
- **Words take turns in a group of 6** instead of 5 slots in a row. One word then comes back about every 3 hours, which is better for memory than 2.5 hours in one block, and the lock screen is not the same for a whole morning. With fewer than 6 words the group is smaller; with one word it repeats.
- **Night slots do not count.** From 23:00 to 07:00 the widget keeps the last word of the evening and no look is counted, because nobody has the chance to see it.
- **Order** (the server decides, the app never sorts): hard words first (fewest looks first, then oldest), then words in review with the nearest due date, then new words in deck order. Known and removed words are never in.
- **After 5 looks** a word leaves the group and the next word in the order comes in. When every word had its 5 looks, a new lap starts with the same order. A word swiped Hard again starts at 0 looks.
- **Looks never touch SRS.** No stage, no due date and no hard mark changes because of the widget. They live in their own table.
- **The server counts by time.** It keeps the plan it handed out (`widget_plans`: user, slots, made at). On the next call it adds one look for every kept slot whose end has passed (`widget_looks`: user, card, looks, lap), then makes a new plan from now. It cannot know whether the widget is on the lock screen; a learner without the widget just rotates unseen.
- **48 hours per plan** (64 slots at most, plus one last entry "New words wait · Open Lockwords"). The app refreshes the plan whenever it is opened, which is free of the iOS refresh budget.
- **The pose is not a rule.** The server sends `look` (1 to 5). The widget maps it to Kai's pose: 1 greeting, 2 idle, 3 thinking, 4 speaking, 5 celebrate. Kai has no animation in a widget; the new pose with each slot is what makes it feel alive.
- **One widget, three lock families.** One `expo-widgets` widget "Lockwords" lists `accessoryRectangular`, `accessoryCircular`, `accessoryInline` (the home sizes join in `home-widgets`). The layout reads `environment.widgetFamily`.
- **Kai on the lock screen is a one-color picture.** iOS keeps only brightness there, so Kai's body is white and the eyes are darker. The five poses are PNG files made from `assets/kai/*.svg` by a script, shipped with the app and copied once into the shared widget folder. If file pictures fail in the extension, the fallback is Kai drawn from rectangles in the layout.
- **Font:** Mona Sans in the rectangular widget if a small config plugin of our own can put the font files into the extension; if not, the system font. The inline widget always uses the system font (iOS decides). This is tried in task 3.2 and the result is written in `tasks.md`.
- **Tap:** the rectangular and inline widgets carry `widgetURL("lockwords://word/<cardId>")`; the circular one `lockwords://review`. The last entry opens the app's start. The word screen is the review flashcard alone, read from `GET /v1/cards/{id}` if it exists, else from the deck; no swipe there.
- **The time zone** comes with the call, like every review call. The day window is 07:00 to 23:00 in that zone.

## Risks
- **Real iPhone signing** (free personal team): may block the app group. Then the widget is simulator-only until the paid account exists; written in `docs/tech-debt.md` as blocked on Hamid.
- **The plan goes stale** when the app is not opened: after 48 hours the widget shows the "open the app" entry. A background refresh is a later change.
- **Words on a locked phone** are visible to anyone who sees the screen. They are only vocabulary; accepted.
