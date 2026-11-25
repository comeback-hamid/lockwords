## Where the layout lives
- `web-layout.ts`: `webMode(windowWidth)` → `phone | tablet | desktop` (always `phone` when the platform is not `web`), `contentWidth(windowWidth, focus)` and the numbers (`WEB`: 600, 1024, column 600, focus column 480, side bar 248). Plain functions, tested in Jest.
- `WebFrame` wraps the root stack in the browser. Inside the tabs it does nothing (the tabs lay themselves out). Outside the tabs it centers a 480 px column from 600 px up. It knows where it is from the router's segments.
- `(tabs)/_layout.web.tsx`: on desktop `tabBarPosition: 'left'` with `WebTabBar side`, and each tab screen gets side padding so its content is the centered column (`sceneStyle`). Review gets the narrower column.

## Why padding and not a max width inside each screen
The tab screens are shared with the phone. Padding on the navigator's scene keeps every screen file untouched, so the phone cannot change.

## Decisions taken (say so if you want another)
- Side bar width 248, row height 48, the open row on `colors.chip`. Uses only theme tokens.
- One column, not two. A two-column Progress is a new design, not a layout rule; it can come later.
- Use it and the deck page open as a focused column with no side bar: they already have their own close button, as on the phone.
- The picture was made from a throwaway prototype (branch `proto/web-desktop`, local only, not pushed). If this proposal is approved, the build starts from tests, and the prototype is only a reference.

## Checks
- Jest: `web-layout` (the three sizes at their edges: 599, 600, 1023, 1024; the phone app is always `phone`; column widths), the side bar (three rows, the open one marked, a tap opens, the dot), `WebFrame` (inside tabs: no column; outside: a 480 column from 600 up).
- Browser (Chromium, Firefox, WebKit) at 390, 820 and 1440 px: every flow of the walk still passes; pictures of the four desktop frames match Figma.
- No Maestro flow: nothing changes on the phone.
