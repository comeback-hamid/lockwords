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

A flow that is on main but no longer fits the product is parked in `e2e/quarantine.txt` (with the reason) until Hamid decides. `npm run e2e` skips parked flows.
