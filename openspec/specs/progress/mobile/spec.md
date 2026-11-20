# progress/mobile Specification

## Purpose
The Progress tab and the screens it opens: the learner's word bank, their decks and how well they know each word.

## Requirements

### Requirement: Your decks
The screen "Your decks" SHALL list the learner's decks from the server: for each the name, "N words · N learning" (or "N words · all new" when no word is started) and a chain of level squares. Above the list: "N DECKS · N WORDS". A row opens that deck. The "+" button opens the New words tab. States: a quiet loading line; an error with "Try again"; with no decks "No decks yet." and "Ask Kai for one in New words."

#### Scenario: Two decks
- **WHEN** the server lists a deck of 20 words with 8 learning and a deck of 4 new words
- **THEN** "2 DECKS · 24 WORDS", "20 words · 8 learning" and "4 words · all new" show

#### Scenario: Open a deck
- **WHEN** the user taps a deck
- **THEN** that deck's page opens

#### Scenario: No decks
- **WHEN** the server lists no decks
- **THEN** "No decks yet." shows

#### Scenario: Error
- **WHEN** the list cannot be loaded
- **THEN** "Could not load your decks." and "Try again" show

### Requirement: Progress tab opens the decks
The Progress tab SHALL show the total of words ("N words in your word bank") and a button "N Decks" that opens Your decks. While loading it shows a quiet loading line; on error a message and "Try again".

#### Scenario: Numbers
- **WHEN** the server says 52 words and 5 decks
- **THEN** "52", "words in your word bank" and the button "5 Decks" show

#### Scenario: One deck
- **WHEN** there is 1 deck
- **THEN** the button reads "1 Deck"
