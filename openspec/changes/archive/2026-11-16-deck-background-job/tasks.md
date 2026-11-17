## 1. Server
- [x] 1.1 Failing tests: slow job, job done while waiting, failed job (`test/unit/deck-jobs.test.ts`); real queue (`test/integration/deck-jobs.test.ts`)
- [x] 1.2 `makeDeckCards` job, inline runner, pg-boss runner, route waits, `generating` state, OpenAPI file

## 2. App
- [x] 2.1 Failing test, then `generateDeck` reads the deck again until ready (`__tests__/api-deck-wait.test.ts`)

## 3. Check
- [x] 3.1 All tests, typecheck, lint, Maestro flows
