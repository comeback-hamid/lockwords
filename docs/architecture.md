# Architecture

Tables and endpoints. Filled in by each change; the server's OpenAPI document is the source for API shapes.

## Services
| Part | Where |
|---|---|
| API server | DigitalOcean App Platform (deploy from GitHub; health check `GET /health`, rollback after 60 s of failures) |
| Database | DigitalOcean Managed Postgres, Frankfurt (FRA1). pg-boss jobs in the same database. |
| Files | DigitalOcean Spaces + CDN |
| Login | Supabase Auth only (guest, Apple, Google, email code). Server checks the token. |
| Builds, updates | Expo EAS (release builds on GitHub Actions only) |

## Databases
| Name | Used by |
|---|---|
| production | the live server only |
| `lockwords_dev` | local server, for the app |
| `lockwords_test` | integration tests (wiped each run; name must contain "test") |

## Endpoints
| Method | Path | What | Added by |
|---|---|---|---|
| GET | `/health` | `{ ok: true }` | repo skeleton |

## Tables
None yet.
