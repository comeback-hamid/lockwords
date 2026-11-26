# e2e (Maestro)

Each flow has exactly **one** area tag: `onboarding`, `new-words`, `review`, `my-words` (the Progress tab), `widget` (`speak` later) (and `platform` for app-wide checks).
A feature flow records a video for Hamid's approval:
```yaml
- startRecording: <change-name>     # a plain name; `npm run e2e` copies it to e2e/videos/<change-name>.mp4
# ... steps ...
- stopRecording
```
Flows that call the server need the local stack: `npm run dev:up`. Pick a simulator with `MAESTRO_DEVICE=<udid>`.
Parallel sessions run their own Metro: `LOCKWORDS_METRO=localhost:<port> npm run e2e` makes every `launchApp` load the app's code from that port (default 8081).
Run: `npm run e2e` (all) or `npm run e2e -- --areas review,my-words`. A few flows again after a fix: `npm run e2e -- --flows word-card,first-run` (file names without `.yaml`). `LOCKWORDS_E2E_KEEP=<folder>` keeps Maestro's screenshots of failed steps and its logs in that folder. Needs the dev build installed on a booted iOS simulator (`cd apps/mobile && npm run ios`).
Videos (`e2e/videos/*.mp4`) are not committed; link them in the PR.

## A full pass: what the server and the simulator need (found on 2026-11-23)
- **No real AI.** Start the local server without `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` in its environment (`env -u OPENAI_API_KEY -u ANTHROPIC_API_KEY ...`). The shell exports them, and with the image key every deck in a flow calls the real image model.
- **Slow pictures for the flows that need them.** A flow that checks the "drawing the pictures" wait is listed in `e2e/slow-pictures.txt` (today: `deck-pictures`). `npm run e2e` runs those flows last, in a second pass: it sets the local server's stand-in picture wait to 30 seconds (`POST /dev/fixture-picture-ms`, local stack only), runs them, and puts the wait back to 0. Every other flow gets its pictures at once. The server's address is read from `apps/mobile/.env.local` (or `LOCKWORDS_API`). A server with a real image key has no such route: the runner says so and fails.
- **`chat-translate-keyboard` needs the on-screen keyboard.** It reads the keyboard's "Emoji" key. A simulator with "Connect Hardware Keyboard" on shows no keyboard and the flow fails after 30 seconds. Simulator "LW New words 2" is set up right.
- **A long run is started detached** (`nohup ... &`). A run tied to the desktop app is cut when the app restarts, in the middle of a recording.

A flow that is on main but no longer fits the product is parked in `e2e/quarantine.txt` (with the reason) until Hamid decides. `npm run e2e` skips parked flows.

## Android
The same flows run on Android: `npm run e2e -- --platform android` (or `LOCKWORDS_PLATFORM=android npm run e2e`), with `--areas` as on iOS. Added 2026-11-25.
- **What it needs:** one running Android emulator or phone (`adb devices`), the **optimized debug build** on it (`cd apps/mobile && npx expo run:android --variant debugOptimized --port <your Metro port>`), Metro on that port, and the local stack. The plain `debug` build is too slow for the flows: its native code is not optimized, the Progress meadow then takes 117 ms per frame (30 ms optimized), the screen never comes to rest and Maestro hangs on the next tap (`progress-home`, found 2026-11-25). With an iOS simulator booted too, the runner picks the first Android device; `MAESTRO_DEVICE=emulator-5554` names one.
- **The emulator reaches this Mac through adb:** `adb reverse tcp:<port> tcp:<port>` for the server, Supabase (54321) and Metro. Then `apps/mobile/.env.local` keeps its `localhost` addresses, the same as for iOS. Run it again after the emulator restarts.
- **The Metro port is part of an Android debug build** (`--port` when it was built). `LOCKWORDS_METRO` is for iOS only.
- **A twin file for a real platform difference:** `name.android.yaml` next to `name.yaml` (in `flows/` or `subflows/`) runs in its place on Android and never on iOS. A flow with only an `.android.yaml` file is Android only. Never change an iOS flow to make Android pass. Today's twins and why are listed at the top of each twin file.
- **Parked on Android only:** `e2e/quarantine.android.txt` (same format as `quarantine.txt`).
- **Videos:** `e2e/videos/android/<name>.mp4`.
- **`hideKeyboard` is the Back key on Android.** With the keyboard already closed, Back leaves the screen: from the Review tab it opens the first tab, from the first tab it leaves the app. So the runner makes every `hideKeyboard` of a flow run only while the keyboard is open (it looks for the keyboard's "Emoji button" key). Found with `new-words-decks`: Kai had already opened Review, the late Back went to New words again.
- **Maestro on Android also lists views that are hidden from screen readers.** A check that something hidden "is not visible" can fail there with a correct app. Two fixes so far: a hidden control has no name on Android until it shows (`nameWhenShown`, `src/platform/hidden-name.ts`: the Delete button of a word row); `word-card` has a twin without the "card under the top card" check.
- **A step takes about 3 seconds on Android** (1 on iOS). The slow-picture flows get a 75 second stand-in wait there (30 on iOS); `LOCKWORDS_SLOW_PICTURE_MS` still wins.
- **The first screen gets 60 seconds on Android** (15 on iOS): after a data wipe a debug build loads all its code from Metro again. The runner changes that one wait in its copy of the flows.
- **Emulator setup that matters** (found 2026-11-25, `Pixel_9_Pro`, Android 16):
  - Start it with `-gpu host -feature -Vulkan`. With Vulkan on, every screenshot and video was plain white on this Mac.
  - Turn the mobile radio off and keep Wi-Fi: `adb shell cmd connectivity airplane-mode enable && adb shell svc wifi enable`. The emulator's signal bars jump between one and two bars, Maestro reads that as "the screen is still changing", and every tap waits longer.
  - `clearKeychain` does nothing on Android, and is not needed: Android deletes an app's secure storage with its data.
- **Why a debug build drops the splash hand-over** (`apps/mobile/plugins/with-android-debug-splash.js`): without it Android left a start animation hanging on the app's window and every Maestro tap took 12 seconds.
- Not in CI: CI builds the Android app (job `android`), it does not run the flows on an emulator.

## Web (Playwright)
The web app is checked in real browsers by `e2e/web/` (added 2026-11-25). One flow, `first-run.spec.ts`, walks the whole app as a new learner: onboarding, Kai's chat, the first deck with pictures, a round (keys, mouse swipes, Undo), Use it (Enter sends, Shift+Enter is a new line), the one-time screens, a single word in New words, voice, Progress and a deck page. It runs in **Chromium, Firefox and WebKit (Safari's engine)** in a phone-size window.
- Two more flows since `web-desktop-layout`: `wide.spec.ts` (a 1440 px window in the three engines: the 480 column of onboarding, the side bar, the columns, the keys under the card, live Kai and the meadow, a word deleted with the mouse, a narrower window, reduced motion) and `touch.spec.ts` (Chrome on a Pixel with a touch screen: finger swipes, the 16 px text box, the home screen files). Projects: `chromium`, `firefox`, `webkit`, `wide-chromium`, `wide-firefox`, `wide-webkit`, `touch-chromium`.
- `edges.spec.ts` (since `fix/web-checks`): what only a browser can do. A reload in onboarding, on a round and on Use it; an address that does not exist; fast keys; the card keys while another tab is open; the chat box growing; no connection and Try again. Projects `edges-chromium` (phone-size) and `edges-webkit` (1440 px).
- Run: `npm run e2e:web` (all three), or `npm run e2e:web -- --project=firefox`. Add `--headed` to watch. About 8 minutes for all nine.
- It needs the local stack (`npm run dev:up`) with the stand-in AI, as Maestro does: start the server without `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`.
- It builds the web app (`npm run build:web`) and serves the built files (`scripts/serve-web.mjs`), so it checks what would go online, not the dev server.
- First time on a Mac: `npx playwright install chromium firefox webkit`.
- A video for Hamid: `LOCKWORDS_WEB_VIDEO=1 npm run e2e:web -- --project=chromium` writes `e2e/videos/web/<test>/video.webm`.
- **It does not run in CI yet.** CI has no local Supabase for the guest login. Run it before a pull request that changes a shared screen, the chat parts, the round, or anything in `src/platform/`.
- Not covered: Safari's voice recording (WebKit under Playwright has no stand-in microphone) and a real phone's browser. Those are checked by hand.
- No simulator is needed, so it can run while Maestro runs.
