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
- **`deck-pictures` needs slow pictures.** It checks the deck card while the pictures are drawn, so the server must run with `FIXTURE_PICTURE_MS=30000`. With the default (`0`) the pictures are ready at once and the flow fails at "drawing a picture for each one". Every other flow passes with `0` and is faster that way. So: run all flows but `deck-pictures` with the default, then start the server again with `FIXTURE_PICTURE_MS=30000` and run `deck-pictures` alone. (open) Hamid decides if this flow should be parked or split so `npm run e2e` is green in one run.
- **`chat-translate-keyboard` needs the on-screen keyboard.** It reads the keyboard's "Emoji" key. A simulator with "Connect Hardware Keyboard" on shows no keyboard and the flow fails after 30 seconds. Simulator "LW New words 2" is set up right.
- **A long run is started detached** (`nohup ... &`). A run tied to the desktop app is cut when the app restarts, in the middle of a recording.

A flow that is on main but no longer fits the product is parked in `e2e/quarantine.txt` (with the reason) until Hamid decides. `npm run e2e` skips parked flows.
