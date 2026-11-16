# account/server Specification

## Purpose
How the server knows who is calling: it checks the Supabase login token on every app request and keeps one user row per person.

## Requirements

### Requirement: Every app request needs a valid login token
Every request to a `/v1/*` path SHALL carry `Authorization: Bearer <token>`, where the token is a Supabase login token. The server SHALL check the token's signature against Supabase's public keys, its issuer, its audience (`authenticated`) and its expiry. Paths outside `/v1/` (`/health`, `/openapi.json`) SHALL NOT need a token.

#### Scenario: No token
- **WHEN** a request to `GET /v1/me` has no `Authorization` header
- **THEN** the server answers `401` with body `{ "error": "unauthorized" }`

#### Scenario: Bad signature
- **WHEN** the token is signed by a key that is not one of Supabase's public keys
- **THEN** the server answers `401` with body `{ "error": "unauthorized" }`

#### Scenario: Expired token
- **WHEN** the token's expiry time is in the past
- **THEN** the server answers `401` with body `{ "error": "unauthorized" }`

#### Scenario: Wrong issuer
- **WHEN** the token was issued by a different Supabase project than the one in the server settings
- **THEN** the server answers `401` with body `{ "error": "unauthorized" }`

#### Scenario: Health needs no token
- **WHEN** a request to `GET /health` has no token
- **THEN** the server answers `200`

#### Scenario: Token is never logged
- **WHEN** any request with a token is handled, good or bad
- **THEN** the server logs contain no part of the token

### Requirement: One user row per person, made on first call
The server SHALL keep a `users` row whose id is the Supabase user id. The first valid request from a new user SHALL create the row. Later requests SHALL reuse it. Two first requests at the same time SHALL still leave exactly one row.

#### Scenario: First call makes the row
- **WHEN** a valid token for a user with no row calls `GET /v1/me`
- **THEN** a `users` row with that id exists afterwards

#### Scenario: Second call reuses the row
- **WHEN** the same user calls `GET /v1/me` twice
- **THEN** there is still exactly one row with that id, and both answers have the same `createdAt`

#### Scenario: Two first calls at once
- **WHEN** the same new user sends two `GET /v1/me` requests at the same time
- **THEN** both answer `200` and there is exactly one row with that id

### Requirement: GET /v1/me tells the app who it is
`GET /v1/me` SHALL answer `200` with `{ "id": string (uuid), "isGuest": boolean, "createdAt": string (ISO date-time) }`. `isGuest` SHALL be `true` when the token says the user is anonymous.

#### Scenario: Guest user
- **WHEN** a valid token with `is_anonymous: true` calls `GET /v1/me`
- **THEN** the answer is `200` with `isGuest: true` and `id` equal to the token's user id

#### Scenario: Non-guest user
- **WHEN** a valid token with `is_anonymous: false` calls `GET /v1/me`
- **THEN** the answer is `200` with `isGuest: false`

### Requirement: The API is described by an OpenAPI document
The server SHALL serve `GET /openapi.json`, an OpenAPI 3.1 document made from the same shapes the server uses to check requests and answers. It SHALL list `GET /v1/me`, its answer shape, the `401` answer, and the bearer login.

#### Scenario: Document lists /v1/me
- **WHEN** a client calls `GET /openapi.json`
- **THEN** the answer is `200` and the document has path `/v1/me` with a `200` answer whose shape has `id`, `isGuest` and `createdAt`, and a `401` answer
