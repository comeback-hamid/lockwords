# e2e (Maestro)

Each flow has exactly **one** area tag: `onboarding`, `new-words`, `review`, `my-words`, `speak`, `widget` (and `platform` for app-wide checks).
A feature flow records a video for Hamid's approval:
```yaml
- startRecording: ../videos/<change-name>
# ... steps ...
- stopRecording
```
Run: `npm run e2e` (all) or `npm run e2e -- --areas review,speak`. Needs the dev build installed on a booted iOS simulator (`cd apps/mobile && npm run ios`).
Videos (`e2e/videos/*.mp4`) are not committed; link them in the PR.
