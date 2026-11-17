# onboarding/server Specification

## Purpose
What the server does for the onboarding questions: gives the word test, estimates known words, and saves the user's profile.

## Requirements

### Requirement: Word test lists
`GET /v1/word-test?language=<code or name>` SHALL answer `200` with `{ supported, madeUp, pages }`. The 13 engine languages get pages A–D of 23 words each (20 real, 3 made-up) as `{ w, rd? }`, in an order fixed per user, with no rank and no made-up flag. Any other real language gets an AI pack once (pages A–C, 20 words, no made-up words), kept for every user. If no pack can be made, `supported` is `false` and `pages` is empty.

#### Scenario: Spanish
- **WHEN** a signed-in user calls `GET /v1/word-test?language=es`
- **THEN** the answer is `200`, `supported` is `true`, and pages A, B, C, D each have 23 words with no `fake` and no `k` field

#### Scenario: Same order for the same user
- **WHEN** the same user calls it twice
- **THEN** both answers are equal; another user gets a different order

#### Scenario: Readings
- **WHEN** the language is `ja` or `zh`
- **THEN** every word has a non-empty `rd`

#### Scenario: A typed language
- **WHEN** a signed-in user calls `GET /v1/word-test?language=Swedish` for the first time
- **THEN** the answer is `200`, `supported` is `true`, pages A, B and C have 20 words each, and a second call returns the same words without a new AI call

#### Scenario: A language with no test
- **WHEN** the word pack cannot be made for a typed language (the AI call fails or says it is not a language)
- **THEN** the answer is `200` with `supported: false` and no pages

#### Scenario: Missing language
- **WHEN** the `language` query is missing or empty
- **THEN** the answer is `400`

### Requirement: Known-words estimate
`POST /v1/word-test/estimate` with `{ language, known: { A, B, C?, D? } }` SHALL score the pages that the next-page rule says were shown, with the model in `docs/vocab-engine.md` section 1.5, and answer `200` with `{ words, outOf: 5000, plus, cefr, startingFresh, reliable, fakesTicked }`. `plus` is true when `words` is 5000. `startingFresh` is true when no real word was ticked. Words that are not in the test are ignored. A language with no test answers `400`.

#### Scenario: Engine table (English)
- **WHEN** the answers are those of each row of engine section 1.8
- **THEN** `words` and `cefr` match the row: all of A → 1,100 A1; all of A and B → 3,500 B2; the B2–C1 learner → 4,700 C1; all of A, B, C and 12 of D → 5,000 with `plus: true`, C2

#### Scenario: Everything known
- **WHEN** every real word of every page and no made-up word is ticked (English)
- **THEN** `words` is 5000, `plus` is true and `cefr` is `C2`

#### Scenario: All basic words only
- **WHEN** every real page-A word and nothing else is ticked (English)
- **THEN** `words` is 1,100 and `cefr` is `A1`

#### Scenario: Unknown words are ignored
- **WHEN** `known` holds only words that are not in the test
- **THEN** `words` is 0 and `startingFresh` is true

#### Scenario: Language with no test
- **WHEN** `language` has no word file and no stored word pack
- **THEN** the answer is `400`

#### Scenario: Nothing known
- **WHEN** no real word is ticked
- **THEN** `words` is 0 and `startingFresh` is true

#### Scenario: Made-up words lower the result
- **WHEN** the B2–C1 answers also hold 1 made-up word, then 2
- **THEN** `words` is 4,200, then 3,800, and `fakesTicked` is 1, then 2

#### Scenario: Guessing
- **WHEN** 3 or more made-up words are ticked and they are at least 30 % of the made-up words shown
- **THEN** `reliable` is false

#### Scenario: Typed-language pack
- **WHEN** every page-A word of an AI pack is ticked, page B has 3 or fewer ticks, so C is skipped
- **THEN** `words` is 850; with all of A and all of B ticked and C shown with 0 ticks, `words` is 2,600 and `cefr` is `B1`

#### Scenario: Never moves the wrong way
- **WHEN** one more real word is ticked, or one more made-up word
- **THEN** `words` does not go down for the real word and does not go up for the made-up word

### Requirement: CEFR label for the estimate
The label SHALL follow engine section 1.6: under 1,500 → A1; under 2,500 → A2; under 3,250 → B1; under 3,750 → B2; under 4,500 → C1; 4,500 and up → C2 only when R50 is 20,000 or more, else C1.

#### Scenario: Label edges
- **WHEN** the result is 1,450, 1,500, 2,500, 3,250 and 3,750
- **THEN** `cefr` is `A1`, `A2`, `B1`, `B2` and `C1`

#### Scenario: Not C2 without proof
- **WHEN** the answers are all of A and B, 16 of C and the 9 rarest D words (English)
- **THEN** `cefr` is `C1`

#### Scenario: Native speaker
- **WHEN** every real word and no made-up word is ticked, in each of the 13 languages
- **THEN** `words` is 5000 and `cefr` is `C2`

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

### Requirement: Next word test page
`POST /v1/word-test/next` with `{ language, known: { A, B, C? } }` SHALL answer `200` with `{ next }`, where `next` is `"C"`, `"D"` or `null`. C comes after B only when 4 or more real B words are ticked. D comes after C only when 15 or more real C words are ticked.

#### Scenario: Few B words
- **WHEN** 3 real B words are ticked
- **THEN** `next` is `null`

#### Scenario: Enough B words
- **WHEN** 4 real B words are ticked and C is not answered yet
- **THEN** `next` is `"C"`

#### Scenario: Expert page
- **WHEN** C is answered with 15 real C words ticked
- **THEN** `next` is `"D"`; with 14 it is `null`

#### Scenario: Made-up words do not count
- **WHEN** 3 real B words and 3 made-up B words are ticked
- **THEN** `next` is `null`

### Requirement: Test results are saved
Every estimate call SHALL save one row for the user: the language, the engine version, `words`, the raw number, the 80 % range, R50, the guessing value, real ticks, made-up ticks, the pages shown, `reliable`, and the ticks as 1 or 0 for every item of every shown page in file order.

#### Scenario: One row per estimate
- **WHEN** a user finishes the test twice
- **THEN** two rows exist for that user, and each holds a ticks string with 23 characters per shown page

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

### Requirement: Check a typed language
`POST /v1/languages/check` with `{ name }` (1–40 characters after trimming) SHALL answer `200` with `{ result, language }`. `result` is `match`, `suggestion` or `unknown`. `language` is `{ code, name, listed }` for `match` and `suggestion`, and `null` for `unknown`. `name` is the English name, `code` the ISO 639-1 code (ISO 639-3 when there is none), `listed` is true for the 13 listed languages (en es fr de it pt ru ar fa tr ja zh ko).

#### Scenario: Bad body
- **WHEN** `name` is missing, empty or longer than 40 characters
- **THEN** the answer is `400`

#### Scenario: No token
- **WHEN** the request has no login token
- **THEN** the answer is `401`

### Requirement: Listed names need no AI
A text that equals a listed language's English name or code (case and outer spaces ignored) SHALL be answered as `match` with that listed language, without an AI call.

#### Scenario: Listed name, no AI
- **WHEN** a signed-in user sends `{ "name": " Spanish " }`
- **THEN** the answer is `200` with `{ result: "match", language: { code: "es", name: "Spanish", listed: true } }` and the AI is not called

### Requirement: The AI judges any other text
Any other text SHALL be judged by the AI. Not a language → `unknown`. A language whose English name equals the text (case and outer spaces ignored) → `match`. Any other language (a misspelling, a native name) → `suggestion`. A listed language found by the AI SHALL be answered with the listed code and name.

#### Scenario: Real language not on the list
- **WHEN** the AI says "swedish" is Swedish (`sv`)
- **THEN** the answer is `match` with `{ code: "sv", name: "Swedish", listed: false }`

#### Scenario: Misspelling
- **WHEN** the AI says "spansh" is Spanish
- **THEN** the answer is `suggestion` with `{ code: "es", name: "Spanish", listed: true }`

#### Scenario: Not a language
- **WHEN** the AI says "qwzx" is not a language
- **THEN** the answer is `{ result: "unknown", language: null }`

### Requirement: A failed AI call is a 502
If the AI call throws, times out or answers something that does not fit the shape, the answer SHALL be `502` with `{ "error": "check_failed" }`.

#### Scenario: AI fails
- **WHEN** the AI call throws
- **THEN** the answer is `502` with `{ "error": "check_failed" }`
