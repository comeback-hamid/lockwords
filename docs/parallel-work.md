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
- **The local server and database: one dev database per session.** The background job queue (pg-boss) lives inside the database. Two servers on the same database take each other's deck jobs, so your app can get a deck made by another branch's code (found 2026-11-18: `first-run` failed at random places). So: `createdb lockwords_dev_<name>`, put it in `DATABASE_URL` in your `apps/server/.env`, run `npm run db:migrate -w @lockwords/server`, and give your server its own `PORT`. The same for `lockwords_test_<name>` if two sessions run database tests at once. Stop your server when you are done: a server left running keeps taking jobs.
- **Maestro: one run per simulator. Two simulators at most.** Runs on two different simulators can go at the same time. Two runs on the same simulator break each other.
  - **Why two:** one booted simulator takes about 5 GB of memory (measured 2026-11-19: about 200 system processes each). This Mac has 24 GB. With five booted the Mac ran out of memory (18.8 GB of swap) and flows failed at random. Check before you boot one: `xcrun simctl list devices booted`. If two are booted, share one of them; do not boot a third. Shut down a simulator you no longer need (`xcrun simctl shutdown <udid>`).
  - **Take that simulator's lock first**, run, then give it back, in one shell command: `L=/tmp/lockwords-maestro-<udid>.lock; until mkdir $L 2>/dev/null; do sleep 20; done; MAESTRO_DEVICE=<udid> LOCKWORDS_METRO=localhost:<port> npm run e2e; rmdir $L`. A `git push` that changes `apps/mobile` or `e2e` runs every flow in its pre-push hook, so it needs the lock too.
  - Always give the lock back, also when the run fails. A lock older than 40 minutes with no Maestro running on that simulator was left behind: remove it.
  - **Say which simulator and which Metro port are yours** in your first message to the session that started you. Never use a simulator because it is booted or because an older note says it is yours. Sessions that share a simulator take turns with its lock.
  - **Never cut a run off** (`timeout`, `kill`, ending the work while it records). A cut-off recording leaves "Host recording is already in progress" on the simulator: every later flow that records fails after 3 seconds, and the simulator can hang on shutdown. Then delete it and make a new one: `xcrun simctl create "LW <area>" com.apple.CoreSimulator.SimDeviceType.iPhone-17 <runtime>`, boot it, `xcrun simctl install <udid> ~/Library/Caches/lockwords-devbuild/Lockwords.app` (a copy of the current dev build).
  - **Start long runs detached** (`nohup <script> >/dev/null 2>&1 & disown`, with the output in a file). The desktop app can be quit while you work, and that kills an attached run.
  - A run with no progress for 20 minutes is stuck. Stop it if it is yours. If it is not yours, message that session; do not kill it.
- **Use `localhost`, not `127.0.0.1`,** for the app's server, Supabase and Metro addresses (`apps/mobile/.env.local`, `LOCKWORDS_METRO`). A VPN app on this Mac turns on a system proxy whose skip list has `localhost` but not `127.0.0.1`. With `127.0.0.1` the simulator's local calls went through that proxy, and when it dropped (about 2 minutes every 10 to 15) the app showed the red screen "No script URL provided" and flows failed at random (found 2026-11-19). `scutil --proxy` shows whether a proxy is on.
- **A flow that fails at a new place each time is the machine, not the code.** Look at memory (`sysctl vm.swapusage`), the proxy, and other sessions' test runs before you change code. A flow that fails at the same step twice is a real failure: read its screenshot (`--test-output-dir`).
- **The dev build:** one build of the app serves all sessions. A PR that adds a native package needs a new build; say so loudly in the PR, because every other session must rebuild.

## Faster with many sessions

The slow part of a batch is not the code. It is the Maestro pass before every push: all flows take about an hour on this Mac, and every merge makes the other sessions test again. When several sessions work on one batch, these two rules apply (Hamid, 2026-11-23). Hamid says at the start of a batch that it runs this way; a single session working alone keeps the normal pre-push pass.

1. **Area-only tests after a merge.** After you merge `origin/main`, run only the flows of the areas your change touches: `LOCKWORDS_E2E_AREAS=review,onboarding` (your own new flow must be among them). Never the full pass again. Name the areas in the PR.
2. **No local simulator run before a push.** When unit tests, typecheck and lint pass, push with `git push --no-verify`. GitHub CI must be green before a merge. Write in the PR: "Pushed without the local Maestro pass". You still record your own feature flow once, for Hamid's video.

**What keeps this safe:** when the whole batch is merged, the session that started the batch runs **one full pass of all flows on `main`**, on one simulator with nothing else running, and records the video for Hamid. What it finds is fixed before any build goes to a phone or to TestFlight. No full pass, no build.

What we learned on 2026-11-23 (five sessions, one Mac):
- Simulators: the rule above says two. Three ran on 2026-11-23, but slowly and with swap almost full. With four, the test driver did not start in time and runs failed for no real reason. Never four.
- Give a finished session's simulator to a session that waits. Do not boot a new one.
- A flow that fails inside a long pass and passes alone is the busy machine. A flow that fails alone at the same step is real: read Maestro's tap log to see what it tapped and where (a text can match an element that is off screen or under the tab bar).
- To end a pass early, end it between two flows, never in the middle of a recording.

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
