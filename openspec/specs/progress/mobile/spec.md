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

### Requirement: Counts, goal grid and date
The Progress tab SHALL show under the total: "N new", "N learning", "N mastered"; a grid with one square per word of the goal (the server's levels first, then dark squares for words not added yet); "BY <MONTH DAY>" from the server's date; "you'll master", the goal number and "new <language> words" (or "new words" with no language).

#### Scenario: Numbers
- **WHEN** the server says 30 new, 18 learning, 4 mastered, goal 100, date 2026-12-29, language Spanish and 52 grid levels
- **THEN** "30 new", "18 learning", "4 mastered", "BY DEC 29", "100" and "new Spanish words" show, with 52 level squares and 48 dark squares

#### Scenario: No words yet
- **WHEN** the server says 0 words and goal 100
- **THEN** the grid has 100 dark squares

### Requirement: The meadow
The Progress tab SHALL draw the meadow from the server's trees: one tree per deck, one leaf block per met word in the color of its level; a deck with no met word is a small stem. With no decks it draws only the ground.

#### Scenario: Two decks
- **WHEN** the server sends two trees with 12 and 0 levels
- **THEN** the meadow has 12 leaf blocks and two trees

#### Scenario: No decks
- **WHEN** the server sends no trees
- **THEN** only the ground is drawn

### Requirement: Word plan on the Progress tab
Under the meadow the Progress tab SHALL show "YOUR WORD PLAN · <GOAL>" and the plan's ideas, each with its topic and "N words · <kind>". The plan loads after the numbers; while it loads, when it is empty, or when it cannot be loaded, the section is not shown. Tapping an idea opens the New words tab, where the chat asks Kai for "A deck about <topic>".

#### Scenario: Three ideas
- **WHEN** the plan has three ideas and the goal "travel"
- **THEN** "YOUR WORD PLAN · TRAVEL" and the three topics with their sizes show

#### Scenario: Tap
- **WHEN** the user taps "Getting around the city"
- **THEN** the New words tab opens and "A deck about Getting around the city" is sent to Kai

#### Scenario: No plan
- **WHEN** the plan is empty or cannot be loaded
- **THEN** there is no word plan section
