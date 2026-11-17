# Lockwords: rules for every agent

Lockwords is a minimal flashcard app for any language: personal decks made by chatting with Kai, fast-swipe review (spaced repetition), hard words on the lock screen, and Use it. v1 tabs: New words · Review · Progress. Speak comes after v1.
Hamid decides **what** to build and what **done** means. Agents build, test and check. Fatima keeps the code clean.

## Read first
1. `docs/product.md`: what is decided (wins over every other doc except Figma).
2. `docs/screens.md`: every Figma screen with a link. **Figma wins** over all docs.
3. `docs/dev-guide.html`: the full way we build (stack, loop, tests, ship).
4. `docs/roadmap.md`: what we build next.
5. `docs/vocab-engine.md`: **the rule for every word we show.** How the word test picks words, how it scores what a learner knows, and how a deck picks words for a level. Read it before touching the word test, the estimate, or deck making. Never invent another method.
6. `docs/parallel-work.md`: **how many sessions work at once.** Read it before you start, every session.
7. The app's own `CLAUDE.md` (`apps/mobile/`, `apps/server/`) for commands and layers.

## Repo map
```
apps/mobile/   Expo app (iOS first) + widget (later, via config plugin)
apps/server/   Hono + Drizzle + Zod + pg-boss. Owns SRS and all AI calls.
docs/          product, screens, design, architecture, roadmap, events, clean-code, tech-debt
openspec/      specs/<domain>/... (truth after archive), changes/ (work in progress)
e2e/           Maestro flows (one area tag each) + videos
.githooks/     pre-push: Maestro pass for this exact code
```

## The loop (one feature = one branch = one PR)
1. `/opsx:explore` (optional) → 2. `/opsx:propose` → push → **draft PR** → 3. **Checkpoint 1: Hamid approves the spec.** No code before this.
4. `/opsx:apply`: failing tests first, then build until green → 5. fresh verifier agent: `/opsx:verify`, `/code-review`, Maestro → 6. **Checkpoint 2: Hamid watches the Maestro video** (`e2e/videos/<change>.mp4`) and approves.
7. `/opsx:archive` as the last commit → squash merge. Tiny fixes skip OpenSpec.
More than ~10 tasks in a change → split it.

## Always
- Tests first: write the test, run it, see it fail for the expected reason, then build.
- Run the checks yourself and report the output. Never ask a human to run them. The checks say "done", not you.
- Planning is not permission to build. Stop after the proposal.
- "(open)" or "Not decided yet" means ask Hamid. Never invent an answer.
- Check the docs for our Expo SDK (58): https://docs.expo.dev/versions/v58.0.0/ and https://docs.expo.dev/llms.txt. Not memory.
- `npx expo install <pkg>` in `apps/mobile`, never `npm install <pkg>` there.
- Colors, type and sizes come from `apps/mobile/src/theme/theme.ts`. No raw values in screens.
- Plain English in docs and specs. Short sentences.
- Keep `docs/roadmap.md` true, in every session: the PR that finishes, starts or drops work also updates its status rows, "Where we are", "Merged so far" and the "Last updated" line. Read it at the start of a session; if it is behind `git log`, fix it first.
- Fix what you can now. `docs/tech-debt.md` is only for work blocked on Hamid (an account, a key, a design, a decision), and says which.
- A skipped part is written in `tasks.md` as "Not done: <what>, <why>". No silent gaps.
- Better idea than this file or the dev guide? Tell Hamid what and why, then wait for his OK. Never change the plan quietly.
- Skip every `picomatch` security warning (Hamid, 2026-11-17). The security check is `npm run audit`, which skips it; never run plain `npm audit` as a gate, and never "fix" it with `npm audit fix --force`. Any other high or critical warning still blocks.
- Add a line to this file only when an agent makes the same mistake twice.

## Never
- Edit or delete an existing test to make it pass. If it looks wrong, stop and ask.
- Commit secrets, `.env` files or `*.p8` keys. Log tokens, emails or secrets. Store tokens only in secure storage.
- Push to `main` or force-push.
- Edit `ios/`, `android/` (generated) or `openspec/changes/archive/`.
- Add a package without saying why. A native package needs a new dev build.
- Invent API shapes. They follow the server's OpenAPI document.
- Re-build SRS rules in the app. The server decides.
- Use Anthropic's "Clawd". Kai is our own character.

## Words (one name per thing)
Code says → users see. Never mix them.

| Code | User sees |
|---|---|
| `card` | word |
| `deck` | deck |
| `review` | Review |
| `kai` | Kai |
| `stage` (0 = new, 1–5) | level square |
| `known` (swiped up) | I know it |
| `useIt` | Use it |
| `talk` (Speak session) | talk |
| `wordBank` | My words |

(open) Fatima confirms this list.

## Git
- Branches: `feature/<name>`, `fix/<name>`, `refactor/<name>`, `clean-code/<name>`, `docs/<name>`. Always from a fresh `origin/main`.
- PR titles: `<emoji> <Name>` (feature), `🔧 Fix | <emoji> <Name>`, `🚧 Refactor | …`, `🧹 Clean Code | …`, `🗂️ Docs | …`.
- Commits: `feat:` `fix:` `test:` `docs:` `refactor:`. Squash merge only. Never merge red.

## Parallel work (many sessions at once)
Full rules and the conflict guide: `docs/parallel-work.md`. The short form:
- One session = one worktree = one branch = one PR. Never use another session's folder or branch.
- Split by area. A session owns its screens, routes, tests and e2e flow. No two sessions own the same file.
- Shared parts (a table, an endpoint, a chat part, the tab layout, theme) go first in a small PR of their own.
- Small PRs, merged often. Start from a fresh `origin/main`; merge `origin/main` again before the PR and run every check again.
- Generated files (`openapi.json`, `schema.ts`, `docs/*.html`) are made again, never merged by hand. A clashing migration is made again on top of main.
- Maestro: one run per simulator at a time. Use your own `MAESTRO_DEVICE` and Metro port, or take turns.
- Two sessions disagree on how something works → stop and ask Hamid.
- Starting another session? Its brief names its area, the files it owns, and links `docs/parallel-work.md`.

## Network note (Iran, VPN off, tested 2026-11-16)
Blocked: Firebase, Expo push, Anthropic API, GitHub API. Working: Supabase, RevenueCat, PostHog, EAS Update.
npm can time out: retry with `--fetch-retries=6 --fetch-timeout=600000`.
