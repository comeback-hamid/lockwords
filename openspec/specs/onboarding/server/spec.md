# onboarding/server Specification

## Purpose
What the server does for the onboarding questions: gives the word test, estimates known words, and saves the user's profile.

## Requirements

### Requirement: Word test lists
`GET /v1/word-test?language=<code or name>` SHALL answer `200` with `{ supported, bands }`. For a seeded language, `supported` is `true` and `bands` has exactly three items in order `basic`, `intermediate`, `advanced`, each with 20–25 different words. For any other language, `supported` is `false` and `bands` is empty.

#### Scenario: Spanish
- **WHEN** a signed-in user calls `GET /v1/word-test?language=es`
- **THEN** the answer is `200`, `supported` is `true`, and there are three bands named `basic`, `intermediate`, `advanced` with 20–25 words each

#### Scenario: A language with no test
- **WHEN** a signed-in user calls `GET /v1/word-test?language=Swedish`
- **THEN** the answer is `200` with `supported: false` and `bands: []`

#### Scenario: Missing language
- **WHEN** the `language` query is missing or empty
- **THEN** the answer is `400`

### Requirement: Known-words estimate
`POST /v1/word-test/estimate` with `{ language, known: string[] }` SHALL answer `200` with `{ knownWords, outOf, cefr }`, where `outOf` is `5000`. Each band stands for a slice of the 5,000 most common words: basic 1,000, intermediate 2,000, advanced 2,000. `knownWords` is the sum over the bands of (known share of the band × slice size), rounded to the nearest 50. Words that are not in the test are ignored.

#### Scenario: Nothing known
- **WHEN** `known` is empty
- **THEN** the answer is `{ knownWords: 0, outOf: 5000, cefr: "A1" }`

#### Scenario: Everything known
- **WHEN** `known` holds every word of the Spanish test
- **THEN** the answer is `{ knownWords: 5000, outOf: 5000, cefr: "C1" }`

#### Scenario: All basic words only
- **WHEN** `known` holds every basic word and nothing else
- **THEN** `knownWords` is `1000` and `cefr` is `A2+`

#### Scenario: Unknown words are ignored
- **WHEN** `known` holds only words that are not in the test
- **THEN** `knownWords` is `0`

#### Scenario: Language with no test
- **WHEN** `language` has no seeded test
- **THEN** the answer is `400`

### Requirement: CEFR label for the estimate
The `cefr` value SHALL follow `knownWords`: under 500 `A1`, under 1,000 `A2`, under 2,000 `A2+`, under 3,000 `B1`, under 4,000 `B2`, else `C1`.

#### Scenario: Label edges
- **WHEN** `knownWords` is 450, 500, 1000, 2000, 3000 and 4000
- **THEN** `cefr` is `A1`, `A2`, `A2+`, `B1`, `B2` and `C1`

### Requirement: Save the profile
`PUT /v1/profile` SHALL save the caller's onboarding answers and answer `200` with the saved profile. A second call replaces the first. A user can only write their own profile.

#### Scenario: Save
- **WHEN** a signed-in user sends a valid body
- **THEN** the answer is `200` with the same values, and the row belongs to that user

#### Scenario: Save again
- **WHEN** the same user sends a different valid body
- **THEN** there is still one profile row for that user, with the new values

### Requirement: Profile fields are checked
The body of `PUT /v1/profile` SHALL have: `learningLanguage` and `nativeLanguage` (1–40 characters), `level` (`brand_new`, `beginner`, `some_basics`, `intermediate`, `advanced`), `knownWords` (0–5000 or null), `cefr` (text or null), `goal` (`travel`, `work`, `move_abroad`, `family_friends`, `brain`, `school`, `other`), `goalOther` (up to 80 characters or null), `interests` (1–5 different items from the fixed list of 20). Anything else is refused.

#### Scenario: Bad body
- **WHEN** `level` is not one of the five values, or `interests` is empty, or an interest is not in the list
- **THEN** the answer is `400` and nothing is saved

#### Scenario: No token
- **WHEN** the request has no login token
- **THEN** the answer is `401`

#### Scenario: More than five interests
- **WHEN** the body has 6 different listed interests
- **THEN** the answer is `400` and nothing is saved

#### Scenario: A dropped interest
- **WHEN** the body has `cooking`, `fitness`, `fashion` or `gaming`
- **THEN** the answer is `400` and nothing is saved

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

### Requirement: The interest list
The list of interests SHALL be these 20: `food`, `travel`, `work`, `business`, `tech`, `science`, `music`, `movies`, `books`, `sports`, `health`, `nature`, `animals`, `art`, `news`, `family`, `friends_dating`, `shopping`, `money`, `culture`. The OpenAPI document lists exactly these.

#### Scenario: Every listed interest is taken
- **WHEN** a body has any one of the 20
- **THEN** the answer is `200`

### Requirement: Old saved interests still read
When the server reads a saved profile, it SHALL map old interests: `cooking` → `food`, `fitness` → `health`, and leave out `fashion` and `gaming` and any other name not on the list. A repeat is kept once, in first-seen order. More than 5 are kept as they are (old rows were allowed up to 24). The row in the database is not changed by a read.

#### Scenario: Old names map
- **WHEN** a saved row holds `['cooking', 'fashion', 'music']`
- **THEN** the profile reads as `['food', 'music']`

#### Scenario: A mapped name repeats
- **WHEN** a saved row holds `['food', 'cooking', 'fitness', 'health']`
- **THEN** the profile reads as `['food', 'health']`

#### Scenario: Only dropped names
- **WHEN** a saved row holds `['fashion', 'gaming']`
- **THEN** the profile reads with no interests
