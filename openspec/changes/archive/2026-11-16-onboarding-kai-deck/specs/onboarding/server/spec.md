# Spec Delta

## ADDED Requirements

### Requirement: Save the name and chat language
`PUT /v1/profile/chat` with `{ name, chatLanguage }` SHALL save them on the caller's profile and answer `200` with `{ name, chatLanguage }`. `name` is 1–40 characters. `chatLanguage` is `native` or `target`. With no profile the answer is `409` with `{ "error": "no_profile" }`.

#### Scenario: Save
- **WHEN** a user with a profile sends `{ "name": "Maya", "chatLanguage": "native" }`
- **THEN** the answer is `200` with the same values

#### Scenario: No profile
- **WHEN** a user with no profile sends valid values
- **THEN** the answer is `409`

#### Scenario: Bad values
- **WHEN** `name` is empty or `chatLanguage` is not one of the two values
- **THEN** the answer is `400`
