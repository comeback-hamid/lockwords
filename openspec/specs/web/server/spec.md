# web/server Specification

## Purpose
Which browser addresses may call the server (CORS).

## Requirements

### Requirement: Browser calls from the web app
The server SHALL answer cross-origin browser calls only for the addresses listed in the `WEB_ORIGINS` setting and for any `http://localhost` or `http://127.0.0.1` port. It allows the headers `Authorization`, `Content-Type` and `X-Time-Zone`, and answers the browser's preflight request. Any other address gets no allow header. Calls with no `Origin` (the phone app) are not changed.

#### Scenario: Listed address
- **WHEN** a call comes with an `Origin` that is in `WEB_ORIGINS`
- **THEN** the answer has `Access-Control-Allow-Origin` with that address

#### Scenario: Local development
- **WHEN** a call comes from `http://localhost:8096`
- **THEN** the answer allows that address

#### Scenario: Unknown address
- **WHEN** a call comes from `https://example.com` that is not listed
- **THEN** the answer has no `Access-Control-Allow-Origin`

#### Scenario: Preflight
- **WHEN** a browser sends `OPTIONS` asking for `Authorization` and `X-Time-Zone`
- **THEN** the answer allows both headers
