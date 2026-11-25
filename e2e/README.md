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
Run: `npm run e2e` (all) or `npm run e2e -- --areas review,my-words`. Needs the dev build installed on a booted iOS simulator (`cd apps/mobile && npm run ios`).
Videos (`e2e/videos/*.mp4`) are not committed; link them in the PR.

## A full pass: what the server and the simulator need (found on 2026-11-23)
- **No real AI.** Start the local server without `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` in its environment (`env -u OPENAI_API_KEY -u ANTHROPIC_API_KEY ...`). The shell exports them, and with the image key every deck in a flow calls the real image model.
- **Slow pictures for the flows that need them.** A flow that checks the "drawing the pictures" wait is listed in `e2e/slow-pictures.txt` (today: `deck-pictures`). `npm run e2e` runs those flows last, in a second pass: it sets the local server's stand-in picture wait to 30 seconds (`POST /dev/fixture-picture-ms`, local stack only), runs them, and puts the wait back to 0. Every other flow gets its pictures at once. The server's address is read from `apps/mobile/.env.local` (or `LOCKWORDS_API`). A server with a real image key has no such route: the runner says so and fails.
- **`chat-translate-keyboard` needs the on-screen keyboard.** It reads the keyboard's "Emoji" key. A simulator with "Connect Hardware Keyboard" on shows no keyboard and the flow fails after 30 seconds. Simulator "LW New words 2" is set up right.
- **A long run is started detached** (`nohup ... &`). A run tied to the desktop app is cut when the app restarts, in the middle of a recording.

A flow that is on main but no longer fits the product is parked in `e2e/quarantine.txt` (with the reason) until Hamid decides. `npm run e2e` skips parked flows.

## Web (Playwright)
The web app is checked in real browsers by `e2e/web/` (added 2026-11-25). One flow, `first-run.spec.ts`, walks the whole app as a new learner: onboarding, Kai's chat, the first deck with pictures, a round (keys, mouse swipes, Undo), Use it (Enter sends, Shift+Enter is a new line), the one-time screens, a single word in New words, voice, Progress and a deck page. It runs in **Chromium, Firefox and WebKit (Safari's engine)** in a phone-size window.
- Two more flows since `web-desktop-layout`: `wide.spec.ts` (a 1440 px window in the three engines: the 480 column of onboarding, the side bar, the columns, the keys under the card, live Kai and the meadow, a word deleted with the mouse, a narrower window, reduced motion) and `touch.spec.ts` (Chrome on a Pixel with a touch screen: finger swipes, the 16 px text box, the home screen files). Projects: `chromium`, `firefox`, `webkit`, `wide-chromium`, `wide-firefox`, `wide-webkit`, `touch-chromium`.
- Run: `npm run e2e:web` (all three), or `npm run e2e:web -- --project=firefox`. Add `--headed` to watch. About 6 minutes for all seven.
- It needs the local stack (`npm run dev:up`) with the stand-in AI, as Maestro does: start the server without `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`.
- It builds the web app (`npm run build:web`) and serves the built files (`scripts/serve-web.mjs`), so it checks what would go online, not the dev server.
- First time on a Mac: `npx playwright install chromium firefox webkit`.
- A video for Hamid: `LOCKWORDS_WEB_VIDEO=1 npm run e2e:web -- --project=chromium` writes `e2e/videos/web/<test>/video.webm`.
- **It does not run in CI yet.** CI has no local Supabase for the guest login. Run it before a pull request that changes a shared screen, the chat parts, the round, or anything in `src/platform/`.
- Not covered: Safari's voice recording (WebKit under Playwright has no stand-in microphone) and a real phone's browser. Those are checked by hand.
- No simulator is needed, so it can run while Maestro runs.
