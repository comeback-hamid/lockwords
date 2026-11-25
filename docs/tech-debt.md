# Tech debt

Fixes that **change behavior**. Each item becomes a `fix/<name>` PR, with a failing test first.

| Date | Where | What | Why it matters | Status |
|---|---|---|---|---|

- **Onboarding shortcuts** (2026-11-16, onboarding-kai-deck): Kai is a still picture per pose (no animated renderer); no card or deck pictures; the composer mic does nothing (voice input comes with Speak); the real Claude call was never run against the API; only Spanish has a word test and a fixture deck.
- **The edit guard blocks changing tests when the product changes** (2026-11-16): an agent parks the old flow in `e2e/quarantine.txt` and asks Hamid. Blocked on Hamid: a standing rule for how an approved spec change may update old tests.
- **First-review shortcuts** (2026-11-16): the paywall sells nothing (RevenueCat not connected; both buttons open the app) and has no rating row or testimonials; no card pictures; this change is bigger than the ~10-task rule.
- **New words: waiting on Hamid** (2026-11-20). Hamid decided both. **Free limits:** none for now; a free user can chat and make decks with no limit. We come back to it after the whole app is built, with the paywall (`free-limits`, roadmap epic 7). **Deck pictures:** none for now; deck cards are text only. Blocked on Hamid: he says when to pick these up again.
- **Deck pictures: waiting on Hamid** (2026-11-23, `fix/deck-language-pictures`). (1) ~~The image key in the cloud~~ done 2026-11-23: `OPENAI_API_KEY` is in the GitHub Actions secrets and in `~/.config/lockwords/secrets.env`; the deploy passes it to the server (`.do/app.yaml`, `deploy.yml`). (2) ~~One sheet or three~~ decided by Hamid 2026-11-23: **keep one sheet per deck** (a deck of 30 gives pictures of 256 × 205 pixels; three sheets would be sharper for about three times the money). The number is `MAX_PER_SHEET` in `apps/server/src/llm/deck-pictures.ts`. (3) **Older tests and the new field:** a card's `imageUrl` is left out when it has no picture, not `null`, because two tests on main compare a card exactly and the edit guard does not let an agent change them. Say if it should be `null`.
- **The widget on a real iPhone: waiting on Hamid** (2026-11-25, `lock-widgets`). The widget works on the simulator. A build for a real phone fails at signing: Xcode on this Mac has no Apple account signed in, the app's profile has no App Groups right, and the widget has no profile. Blocked on Hamid: sign in to Xcode (Settings → Accounts) with his Apple ID. If the free team then refuses the app group, the paid Apple Developer account is needed.
