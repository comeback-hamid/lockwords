# Working in parallel

Many sessions build Lockwords at the same time. One session per page part (for example: onboarding languages, New words deck ideas, Review streak). This file says how they stay out of each other's way.

**Every session reads this file before it starts work.** A session that starts another session puts a link to this file in the brief.

## The six rules

1. **One session = one worktree = one branch = one PR.** Never work in a folder another session uses. Never check out your branch in someone else's worktree. Make your own: `git worktree add ../lockwords-<name> -b feature/<name> origin/main`.
2. **Split by area, not by step.** A session owns one part of one page: its screens, its routes, its tests, its e2e flow. Two sessions never own the same file.
3. **Shared parts go first, alone.** If two sessions both need the same new table, endpoint, or chat part, one small PR adds it and merges. The others start after it, from the new `origin/main`.
4. **Small PRs, merged often.** Aim for one day per branch. A long branch makes big conflicts.
5. **Start from a fresh `origin/main`, and merge `origin/main` again before you open or update the PR.** Run all checks again after the merge.
6. **Say what you own.** The brief for a session names its area, the files it may touch, and the shared files it must not touch. If you find you need a file outside your area, stop and tell the session that started you (or Hamid).

## Shared files (where conflicts come from)

Different screens rarely clash. These files do, because almost every feature touches them:

| File | Why it clashes | What to do |
|---|---|---|
| `apps/server/openapi.json`, `apps/mobile/src/api/schema.ts` | Made again for every new endpoint | Never merge by hand. Take main's copy, then run `npm run openapi` and `npm run api:gen`. |
| `apps/server/src/db/schema.ts`, `apps/server/drizzle/` | New tables and columns; migration numbers collide | The branch that merges second deletes its own migration and makes it again on top of main. |
| `apps/server/src/app.ts` | Every new route is wired here | Add your lines only. Keep both sides on a conflict. |
| `apps/mobile/src/api/client.ts` | Every new server call | Add your function only. Keep both sides on a conflict. |
| `apps/mobile/src/components/chat/` | Onboarding, New words and Use it share it | Change it only in a small PR of its own (rule 3). |
| `apps/mobile/src/app/(tabs)/_layout.tsx`, `apps/mobile/src/theme/theme.ts` | Shared shell and tokens | Same: a small PR of its own. |
| `e2e/subflows/finish-onboarding.yaml` | Every flow starts with it | Only the session that changes onboarding edits it, and it runs every flow after. |
| `docs/roadmap.md`, `docs/tech-debt.md` | Every PR updates them | Keep both sides' lines. Fix the "Last updated" line last. |
| `docs/roadmap.html`, `docs/product.html` | Made from the `.md` files on commit | Never merge by hand. Take either side; the pre-commit hook makes them again. |

## When a conflict happens

1. Merge `origin/main` into your branch. Do not rebase a branch that already has a PR, and never force-push.
2. Generated files: take main's copy and run the generator again (see the table).
3. Migrations: delete yours, pull main's, make yours again.
4. Code: keep both sides when both add something. When both change the same lines, read both and keep what both specs need.
5. Run every check again: unit tests, type check, lint, `openspec validate --all --strict`, and Maestro.
6. **A real disagreement** (two sessions built the same thing in two ways, or two specs say different things): stop. Ask Hamid which one wins. Never pick quietly.

## One Mac, shared machines

All sessions run on the same Mac. Some things cannot be split by a worktree:

- **Unit tests:** fine in parallel.
- **The local server and database:** `npm run dev:up` gives one server on port 8787 and one `lockwords_dev` / `lockwords_test` database for everyone. A migration from one branch changes the database for all. If your branch adds a migration, say so in your PR and expect other sessions to run `npm run dev:up` again.
- **Maestro: one run at a time on the whole Mac.** On 2026-11-17 two runs at once (two sessions that both thought iPhone 17 was theirs) hung each other for an hour and one session lost its results. So:
  - **Take the lock first**, wait for Maestro to be free, run, then give the lock back, in one shell command: `until mkdir /tmp/lockwords-maestro.lock 2>/dev/null; do sleep 20; done; while pgrep -f "maestro\.cli\.AppKt" >/dev/null; do sleep 15; done; MAESTRO_DEVICE=<udid> LOCKWORDS_METRO=127.0.0.1:<port> npm run e2e; rmdir /tmp/lockwords-maestro.lock`. A `git push` that changes `apps/mobile` or `e2e` runs every flow in its pre-push hook, so it needs the lock too.
  - Always give the lock back, also when the run fails. A lock older than 40 minutes with no Maestro running was left behind: remove it.
  - **Use your own simulator and your own Metro port. Say which in your first message to the session that started you.** Never use a simulator because it is booted or because an older note says it is yours. Need one? Make it: `xcrun simctl create "LW <area>" com.apple.CoreSimulator.SimDeviceType.iPhone-17 <runtime>`, boot it, and install the dev build (`xcrun simctl install <udid> ~/Library/Caches/lockwords-devbuild/Lockwords.app`, a copy of the current build). Sessions that work on the same page can share one simulator, since they take turns anyway.
  - A run with no progress for 20 minutes is stuck. Stop it if it is yours. If it is not yours, message that session; do not kill it.
  - This Mac has 24 GB of memory. Do not boot a simulator you do not need, and stop your server and Metro when you are done.
- **The dev build:** one build of the app serves all sessions. A PR that adds a native package needs a new build; say so loudly in the PR, because every other session must rebuild.

## Before you start (checklist)

- [ ] I read `AGENTS.md` and this file.
- [ ] I have my own worktree and branch, made from a fresh `origin/main`.
- [ ] I know my area and which files I own.
- [ ] I checked open PRs (`gh pr list`) for work that touches the same files.
- [ ] If I need a shared part, there is a small PR for it first.

## Before you open the PR (checklist)

- [ ] I merged `origin/main` and ran every check again.
- [ ] Generated files were made again, not merged by hand.
- [ ] `docs/roadmap.md` is updated.
- [ ] The PR says what shared files it touches, if any.
