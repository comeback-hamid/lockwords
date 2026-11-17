## ADDED Requirements

### Requirement: Check a typed language
`POST /v1/languages/check` with `{ name }` (1–40 characters after trimming) SHALL answer `200` with `{ result, language }`. `result` is `match`, `suggestion` or `unknown`. `language` is `{ code, name, listed }` for `match` and `suggestion` and `null` for `unknown`: `name` is the English name, `code` the ISO 639-1 code (ISO 639-3 when there is none), `listed` is true for the 13 listed languages (en es fr de it pt ru ar fa tr ja zh ko). A text that equals a listed language's English name or code (case and spaces ignored) SHALL be answered as `match` without an AI call. Any other text SHALL be judged by the AI: not a language → `unknown`; a language whose English name equals the text (case and spaces ignored) → `match`; any other language (misspelling, native name) → `suggestion`. A listed language found by the AI is answered with the listed code and name. If the AI call fails or times out the answer SHALL be `502` with `{ "error": "check_failed" }`.

#### Scenario: Listed name, no AI
- **WHEN** a signed-in user sends `{ "name": " Spanish " }`
- **THEN** the answer is `200` with `{ result: "match", language: { code: "es", name: "Spanish", listed: true } }` and the AI is not called

#### Scenario: Real language not on the list
- **WHEN** the AI says "swedish" is Swedish (`sv`)
- **THEN** the answer is `match` with `{ code: "sv", name: "Swedish", listed: false }`

#### Scenario: Misspelling
- **WHEN** the AI says "spansh" is Spanish
- **THEN** the answer is `suggestion` with `{ code: "es", name: "Spanish", listed: true }`

#### Scenario: Not a language
- **WHEN** the AI says "qwzx" is not a language
- **THEN** the answer is `{ result: "unknown", language: null }`

#### Scenario: AI fails
- **WHEN** the AI call throws or answers something that does not fit the shape
- **THEN** the answer is `502` with `{ "error": "check_failed" }`

#### Scenario: Bad body
- **WHEN** `name` is missing, empty or longer than 40 characters
- **THEN** the answer is `400`

#### Scenario: No token
- **WHEN** the request has no login token
- **THEN** the answer is `401`
