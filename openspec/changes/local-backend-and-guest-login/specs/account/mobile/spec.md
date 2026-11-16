# Spec Delta

## Purpose
How the app gets a user without asking: a silent guest sign-in on first open, a session that survives restarts, and the first call to the server.

## ADDED Requirements

### Requirement: Silent guest sign-in on first open
When the app opens with no saved session, it SHALL sign in as a guest with Supabase without showing any screen, button or message for it. The tabs SHALL show while this runs.

#### Scenario: Fresh install
- **WHEN** the app opens for the first time
- **THEN** it signs in as a guest, saves the session, and the user sees the tabs with no login step

#### Scenario: Sign-in fails (no network or login server down)
- **WHEN** the guest sign-in fails
- **THEN** the app still shows the tabs, shows no error, and tries again on the next open

### Requirement: The session survives restarts
The app SHALL keep the session in the phone's secure storage only. Reopening the app SHALL reuse the saved session and SHALL NOT make a new guest. The app SHALL refresh the session by itself before it expires.

#### Scenario: Reopen keeps the same user
- **WHEN** the app is closed and opened again
- **THEN** `GET /v1/me` returns the same `id` as before

#### Scenario: Fresh install after delete
- **WHEN** the app is deleted and installed again
- **THEN** no old session is used (secure storage is cleared on a fresh install), and a new guest is made

### Requirement: The app tells the server who it is
After it has a session, the app SHALL call `GET /v1/me` with the login token, using API types generated from the server's OpenAPI document.

#### Scenario: Server reachable
- **WHEN** the app has a session and the server is up
- **THEN** the app calls `GET /v1/me` once at start and gets `200`

#### Scenario: Server down
- **WHEN** the server cannot be reached
- **THEN** the app still shows the tabs, shows no error, and calls again on the next open

### Requirement: App screens during sign-in
Guest sign-in has no screen of its own. The tabs SHALL behave the same in every sign-in state.

#### Scenario: Loading
- **WHEN** sign-in is still running
- **THEN** the tabs show as normal (no spinner, no blocking)

#### Scenario: Empty, error, locked
- **WHEN** there is no session, sign-in failed, or the server answers `401`
- **THEN** the tabs show as normal; nothing is locked by sign-in in this change
