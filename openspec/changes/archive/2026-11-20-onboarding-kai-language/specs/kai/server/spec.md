## ADDED Requirements

### Requirement: Kai's onboarding script by language
`GET /v1/kai/script` with `native` and `learning` (1–40 characters each) SHALL answer `200` with `{ native, learning }`: two maps from line key to text with the keys of the English script. English is built in. Another language is translated once by the AI task and kept. Place holders (`{name}`, `{language}`), `**bold**` marks and emoji stay. If a translation fails or misses a key, that map is the English script and nothing is kept.

#### Scenario: English
- **WHEN** both languages are English
- **THEN** both maps are the English script and no AI call is made

#### Scenario: First call for a language
- **WHEN** `native` is Persian and no Persian script is kept
- **THEN** the AI translates it once, it is kept, and `native` has every key

#### Scenario: Second call
- **WHEN** the Persian script is asked for again
- **THEN** no AI call is made

#### Scenario: Bad translation
- **WHEN** the AI answer misses a key or drops a place holder
- **THEN** that map is the English script and nothing is kept
