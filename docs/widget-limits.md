# iOS widget limits (what we can and cannot do)

Written 2026-11-25, before the widget design. Read from Apple's current docs and from the `expo-widgets` 58.0.28 source, not from memory.
"AD" = `https://developer.apple.com/documentation`, "HIG" = `https://developer.apple.com/design/human-interface-guidelines/widgets`.
Where Apple's docs say nothing, this file says so.

## The short list

| # | Limit | What it means for Lockwords |
|---|---|---|
| 1 | **iOS never tells us that a person saw a widget.** | We cannot count real views. We count time slots (see "Seen 5 times"). |
| 2 | **No free animation.** A widget only animates when its content changes, for 2 seconds at most. | Kai cannot move by itself. Kai gets a new still pose with every new word slot. |
| 3 | **The widget cannot fetch.** With `expo-widgets` its code has no network and no timers. | The app gets the word plan from the server and hands it to the widget. |
| 4 | **The lock screen has no color.** iOS turns everything into one tint. | Lock widgets are designed in white and greys. Kai needs a one-color drawing. |
| 5 | **A lock screen widget is tiny.** 160×72 points for the big one. | One hard word, its meaning, five small squares, a small Kai. Nothing more fits. The round one (72×72) is too small for a word, so we do not make it. |
| 6 | **A real iPhone needs an app group on the Apple account.** | Works on the simulator. On Hamid's phone the build with the app group installs (2026-11-26, paid team; see "Signing"). |

## 1. Sizes

Sizes in points, from the HIG table "iOS dimensions":

| iPhone screen | Small | Medium | Large | Circular | Rectangular | Inline |
|---|---|---|---|---|---|---|
| 430×932 | 170×170 | 364×170 | 364×382 | 76×76 | 172×76 | 257×26 |
| 393×852 and 390×844 (our Figma frame) | 158×158 | 338×158 | 338×354 | 72×72 | 160×72 | 234×26 |
| 375×812 | 155×155 | 329×155 | 329×345 | 72×72 | 157×72 | 225×26 |

- Home screen: small, medium, large. The extra large size is iPad only.
- Lock screen: inline (one line of text next to the date), circular, rectangular.
- The small widget also shows in StandBy (the phone on its side while charging).
- Sizes for the newest screens (402×874, 440×956) are not in Apple's table. The layout must stretch, not use fixed numbers.
- **We use:** inline, rectangular, small, medium. No circular widget (Hamid, 2026-11-25: hard words only, no card count) and no large widget in v1.

## 2. Animation

- A widget animates only when its entry changes. "Animations in widgets and Live Activities have a maximum duration of two seconds." (AD `/widgetkit/animating-data-updates-in-widgets-and-live-activities`)
- No loops, no video, no Skia canvas. Our live Kai (Skia) cannot run in a widget.
- A clock or countdown text can tick by itself (`Text(date, style:)`). We do not need it.
- When the screen is dimmed (Always-On), nothing animates.
- `expo-widgets` does not give us control over the change animation. We get the system's default cross-fade.

## 3. Refresh budget

All from AD `/widgetkit/keeping-a-widget-up-to-date`.

- A widget shows a **timeline**: a list of "at this time, show this". The app can hand over many entries at once. Apple: "generate a timeline for as many future dates as possible".
- Asking for a **new** timeline is limited: "a daily budget typically includes from 40 to 70 refreshes", about one every 15 to 60 minutes.
- Entries should be "at least about 5 minutes apart".
- A reload is free while our app is open on screen.
- **For us:** one timeline holds the whole day (and the next days). Changing the word every 30 minutes costs no budget, because the entries are already in the timeline. We only reload when the app is open, where it is free.
- Apple's docs give no maximum number of entries.

## 4. What a tap can do

- A tap on a widget opens the app. One address per widget (`widgetURL`), so we can open the right word.
- Small widgets and lock widgets have **one** tap target. Medium and larger can have several (`Link`).
- Buttons that work without opening the app exist (iOS 17+), but on a locked phone they do nothing until the phone is unlocked. v1 has no buttons (`docs/product.md` 7.4).
- (AD `/widgetkit/linking-to-specific-app-scenes-from-your-widget-or-live-activity`, `/widgetkit/adding-interactivity-to-widgets-and-live-activities`)

## 5. Colors and where a widget shows

| Where | What iOS does |
|---|---|
| Home screen, light or dark | Full color. We get told light or dark. |
| Home screen, "tinted" (iOS 18) or "clear" (iOS 26) | iOS removes our background and paints all content in one tint or as glass. A picture becomes one flat shape unless we mark it "desaturated". |
| Lock screen | No color. iOS reads only how bright each pixel is: white is strong, grey is weaker, black is gone. Use solid greys, not see-through white. (HIG) |
| StandBy at night | Same as the lock screen, in red. |

- The inline widget is text (and one system symbol) only. The font and size are the system's. No Kai there.
- The circular widget gets a soft round backdrop from iOS (`AccessoryWidgetBackground`).
- Apple's own pages disagree about the small widget on iOS 26 (one says full color, one says tinted). To check on a device.

## 6. Memory, pictures, fonts

- **Memory:** Apple's docs give no number. Crash logs on Apple's developer forums show 30 MB for a widget. So: small pictures only.
- **Pictures:** `expo-widgets` shows system symbols, or a picture file the app wrote into the shared folder: PNG, JPEG, and also WebP (seen working on the iOS 26.5 simulator, 2026-11-25: our card pictures are WebP, 512×410, and show as they are). No SVG files. Big pictures fail ("image being too large", from the forums, no number in the docs). The app must shrink a picture before it saves it.
- **Kai** is a small PNG file per pose (one color for the lock screen, full color for the home screen), made from Kai's SVG poses by `npm run widget:kai`.
- **Fonts:** the system font always works. Apple says to use a custom font "sparingly", 11 points at least. Mona Sans needs the font files inside the widget and a small config plugin of our own; `expo-widgets` has no setting for it. **Not tested.** If it fails, the widget uses the system font.

## 7. How data gets to the widget

- The app and the widget share one folder, the **app group** (`group.ai.dailydoses.lockwords`). The app writes, the widget reads.
- With `expo-widgets` the app calls `updateTimeline(entries)`. The widget then runs alone from that list (`policy: .atEnd`).
- The widget cannot ask the server by itself. If the app is not opened for days, the list runs out and the widget keeps its last entry. So the last entry must be a good one ("Open Lockwords · for your hard words").
- A silent push can ask iOS to reload a widget (iOS 26), but it cannot bring new words without our app code running, and it needs the paid Apple account. Not in v1.
- `expo-widgets` cannot tell us whether the person added the widget. So the metric "Widget added" (`docs/product.md` 5) cannot be measured yet. A tap on the widget can be counted.

## 8. Seen 5 times: is there a "seen" signal? No.

- iOS draws a widget **ahead of time** and keeps the picture: "the system archives a view representation" and "WidgetKit may render the widget's view in advance" (AD `/widgetkit/adding-interactivity-to-widgets-and-live-activities`, `/widgetkit/timelineprovidercontext`). Our code does not run when the person looks.
- No API reports a view. `WidgetCenter` only lists which widgets are installed. The Smart Stack "relevance" API only goes one way, from us to iOS.
- What we can know: the time, and a tap.
- **So we use fixed time slots** (the choice and the reason are in the OpenSpec change `lock-widgets`): each word is on the widget for 30 minutes at a time, and a word is done after 5 slots.

## 9. What the spike proved (2026-11-16, draft PR #3, never merged)

- A word from our server reached the lock screen on the iOS 26.5 simulator, with `expo-widgets` and no hand-made `ios/` folder.
- Changing the word needs no new build. Adding the widget needs **one new dev build**.
- Not tested then: a real iPhone, Mona Sans, pictures, a timeline with many entries, a tap that opens a word.

## 10. Signing (2026-11-26)

- The iPhone app is `ai.dailydoses.lockwords`, signed by Hamid's **paid Apple team** (`2GZW9557HC`, in `app.json` as `appleTeamId`).
- The widget is a second small program with its own ID (`ai.dailydoses.lockwords.ExpoWidgetsTarget`). Both have the app group. Xcode made both profiles.
- A signed Release build with all four widgets was installed on Hamid's iPhone on 2026-11-26. **Not seen yet:** the widgets on the real lock screen and home screen (no agent can see the phone).
- The first ID, `com.comebackhamid.lockwords`, belongs to a free personal team of another Apple account. A free team's ID cannot be moved or deleted, so the paid team could not use it. Android still uses that name as its package.
- How to make the build: `apps/mobile/CLAUDE.md`, "A build for a real iPhone".
