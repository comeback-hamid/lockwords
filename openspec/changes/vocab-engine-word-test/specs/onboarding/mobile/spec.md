## MODIFIED Requirements

### Requirement: O4–O6 Word test
For a language with a test, the app SHALL show "Tap the words you know" pages with the server's words as chips: BASIC WORDS, INTERMEDIATE WORDS, then ADVANCED WORDS and EXPERT WORDS only when the server says so. Each page shows the line "Only tap words you know the meaning of. Some are made up." and "N SELECTED". A reading shows small under a word that has one. "I don't know any of these" clears the page and continues. States: loading (quiet loading line), error (message and "Try again"); empty and locked do not apply.

#### Scenario: Select and count
- **WHEN** the user taps three chips
- **THEN** the three chips are selected and the label reads "3 SELECTED"

#### Scenario: Short test
- **WHEN** the server answers `next: null` after page B
- **THEN** the result page shows; no ADVANCED page

#### Scenario: Long test
- **WHEN** the server answers `next: "C"` and later `next: "D"`
- **THEN** the ADVANCED WORDS page shows, then the EXPERT WORDS page, then the result

#### Scenario: Words below the screen
- **WHEN** some chips are below the screen and were never on screen
- **THEN** the button reads "See all words ↓" and scrolls down instead of moving on

#### Scenario: Language without a test
- **WHEN** the server says the language has no test
- **THEN** the app goes from O3 to O8 with no word test and no result page

#### Scenario: Server error
- **WHEN** the word test or the next page cannot be loaded
- **THEN** a message and "Try again" show; tapping it loads again

### Requirement: O7 Your estimate
After the last page the app SHALL ask the server for the estimate and show: Kai celebrating, "YOU ALREADY KNOW", "≈ N" with a thousands comma (or "5,000+"), counting up from 0, "of the 5,000 most common <language> words", the chip "About level X", and "An estimate from your word test." States: loading (number hidden, quiet loading line), error (message + "Try again").

#### Scenario: Show the estimate
- **WHEN** the server answers `{ words: 4700, plus: false, cefr: "C1" }`
- **THEN** the screen shows "≈ 4,700", "of the 5,000 most common Spanish words" and "About level C1"

#### Scenario: Top of the scale
- **WHEN** the server answers `{ words: 5000, plus: true, cefr: "C2" }`
- **THEN** the number reads "5,000+"

#### Scenario: Starting fresh
- **WHEN** the server answers `startingFresh: true`
- **THEN** the screen shows "You're starting fresh" and no number

#### Scenario: A made-up word was ticked
- **WHEN** `fakesTicked` is 1 or more and the result is shown
- **THEN** a short note says some ticked words were made up, so the number was lowered

## ADDED Requirements

### Requirement: Try again after guessing
When the server answers `reliable: false` for the first time, the app SHALL show a screen with two buttons before the result: "Try again" (clears every answer and goes back to the BASIC WORDS page) and "Show my result". A second unreliable result shows the number with no such screen.

#### Scenario: First unreliable result
- **WHEN** the estimate answers `reliable: false` for the first time
- **THEN** the Try again screen shows, not the number

#### Scenario: Show my result
- **WHEN** the user taps "Show my result"
- **THEN** the result page shows the number and the made-up words note

#### Scenario: Second try
- **WHEN** the user tapped "Try again" and the new result is unreliable again
- **THEN** the result page shows at once
