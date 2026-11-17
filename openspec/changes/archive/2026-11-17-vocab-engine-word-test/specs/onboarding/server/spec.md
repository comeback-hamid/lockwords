## MODIFIED Requirements

### Requirement: Word test lists
`GET /v1/word-test?language=<code or name>` SHALL answer `200` with `{ supported, pages }`. For the 13 engine languages `supported` is `true` and `pages` holds A, B, C and D, each with 23 different words (20 real, 3 made-up) as `{ w, rd? }`, in an order that is the same on every call by the same user. The answer never says which words are made up and never holds a rank. For any other real language (already checked by the language check) the server makes an AI word pack once: pages A, B and C with 20 words each and no made-up words, kept and reused for every user of that language. If the pack cannot be made, `supported` is `false` and `pages` is empty.

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

## ADDED Requirements

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
