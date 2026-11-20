# kai/server Specification

## Purpose
How the server lets Kai answer what a learner types in a Kai chat, so a question off the script gets a short, real answer.

## Requirements

### Requirement: Kai reads typed text
`POST /v1/kai/reply` with `{ step, text, options? }` SHALL answer `200` with either `{ onScript: true, answer }` (the text answers the current step) or `{ onScript: false, lines }` (it does not; `lines` is Kai's answer). `step` is one of `name`, `language`, `topic`, `proposed`, `generating`, `ready`. `text` is 1–200 characters. `options` are the reply options on screen (at most 6).

#### Scenario: Shape
- **WHEN** a user sends a valid request
- **THEN** the answer is `200` with `onScript` and either `answer` or `lines`

### Requirement: What counts as an answer
`answer` SHALL be, per step: `name` → the name only (1–40 characters); `language` → `native` or `target`; `topic` → the topic (1–80 characters); `ready` → `practice` or `wordsFirst`. In `proposed` and `generating` every text SHALL be off the script.

#### Scenario: A name
- **WHEN** a user sends `{ step: "name", text: "I'm Maya" }`
- **THEN** the answer is `{ onScript: true, answer: "Maya" }`

#### Scenario: A question instead
- **WHEN** a user sends `{ step: "name", text: "Why do you need my name?" }`
- **THEN** the answer is `{ onScript: false, lines: [...] }` with 1–2 lines

#### Scenario: Language by words
- **WHEN** a user whose native language is English sends `{ step: "language", text: "english please", options: ["English", "Español"] }`
- **THEN** the answer is `{ onScript: true, answer: "native" }`

#### Scenario: While the deck is made
- **WHEN** a user sends any text with `step: "generating"`
- **THEN** the answer has `onScript: false`

#### Scenario: Bad input
- **WHEN** `step` is unknown or `text` is empty or over 200 characters
- **THEN** the answer is `400`

### Requirement: Kai's answer lines
`lines` SHALL be 1–2 short lines (at most 160 characters each), friendly, with an emoji, key words in `**bold**`, in English, and never a question that takes the chat elsewhere.

#### Scenario: Short lines
- **WHEN** the answer is off the script
- **THEN** there are 1 or 2 lines, each at most 160 characters

### Requirement: Kai's answer fails safely
The AI call SHALL time out after 8 seconds. A failed call or an answer that does not match the shape SHALL answer `502` with `{ "error": "kai_unavailable" }`. Nothing is saved.

#### Scenario: AI fails
- **WHEN** the model throws or answers bad JSON
- **THEN** the answer is `502` with `{ "error": "kai_unavailable" }`

### Requirement: Kai knows the learner
The AI call SHALL get the step, the text, the options, and from the caller's profile the learning and native languages and the chat name if saved. With no profile it still answers.

#### Scenario: No profile
- **WHEN** a user with no profile sends a name
- **THEN** the answer is `200`

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
