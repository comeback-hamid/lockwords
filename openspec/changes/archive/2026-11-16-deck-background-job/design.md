## Context
pg-boss was already a dependency and uses the same Postgres, so no new service is needed.

## Decisions
- **The deck's status is the job's state** (`proposed` → `generating` → `ready`, or back to `proposed`). No extra job table to read, and no `failed` state: "nothing saved" stays true.
- **Only the call that moves the deck to `generating` adds a job.** Two taps make one job.
- **The request waits up to 20 seconds.** A fast job still answers in one call, so old callers keep working.
- **Without a queue the job runs inside the call** (`inlineDeckJobs`). Unit tests need no Postgres.
- **The app waits in `client.ts`**, not in the screen: it reads the deck every 2 seconds, for 3 minutes at most.

## Risks
- The server stops mid-job: pg-boss runs the job again (2 retries). The job is safe to run twice.
