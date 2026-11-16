# apps/server

Node 22 + TypeScript strict. Hono (HTTP), Drizzle ORM (Postgres, migrations), Zod (validation), pg-boss (background jobs, same database), Vitest.

## Commands (run from this folder)
```bash
npm run dev                # local server on :8787, uses .env (copy .env.example)
npm test                   # unit tests: no database, no network
npm run test:integration   # real database lockwords_test (name must contain "test")
npm run typecheck
npm run lint
npm run db:generate        # new migration from src/db/schema.ts
npm run db:migrate
```
Local databases: `npm run db:setup` from the repo root creates `lockwords_dev` and `lockwords_test`.

## Layers
`routes/` (HTTP, Zod in/out) → `services/` (rules: SRS, limits, deck rules; pass `now` in, never read the clock inside) → `db/` (Drizzle tables + queries).
`llm/`: one client for every model call, one module per AI task (see `src/llm/README.md`).
`reference/lockwords-fn/`: old funnel code with working prompts. Port from it; do not import it.

## Rules
- The server owns SRS. The app never decides stages.
- Migrations are add-only. Drop or rename in a later deploy.
- AI keys live only here. Every model call has a timeout and a user message. A failed call saves nothing.
- Tests never call a real model. One fixture replaces Langfuse and the model.
- Each user reads only their own rows. Keep Speak text, never audio.
- The server checks the Supabase token. No other Supabase parts.
- `GET /health` must stay fast: the deploy rolls back if it fails for 60 s.
