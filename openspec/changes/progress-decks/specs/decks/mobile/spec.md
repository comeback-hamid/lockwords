## ADDED Requirements

### Requirement: Deck numbers and filters
The deck page SHALL show, under the title, "N LEARNING · N HARD", a chain of level squares, and filter chips with counts: "All", "Hard", "New", "Mastered", and "Known" when the deck has known words. A chip shows only its words. A hard word has a red mark. Known words are listed only under "Known".

#### Scenario: Filter Hard
- **WHEN** a deck has 10 words, 2 of them hard, and the user taps "Hard 2"
- **THEN** only the 2 hard words are listed

#### Scenario: No known words
- **WHEN** no word of the deck is known
- **THEN** there is no "Known" chip

#### Scenario: Empty filter
- **WHEN** the user taps a chip with no words
- **THEN** "No words here." shows

### Requirement: Restore a known word
Under "Known", each word SHALL have a "Restore" button. It tells the server and the word goes back to the other lists. If the server cannot be reached the page says "Could not restore the word."

#### Scenario: Restore
- **WHEN** the user taps Restore on "la carta"
- **THEN** the server is told and "la carta" is listed under "All" again

#### Scenario: Restore fails
- **WHEN** the server cannot be reached
- **THEN** "Could not restore the word." shows and the word stays under "Known"

### Requirement: Review this deck
The deck page SHALL have a button "Review this deck". It loads today's round for this deck and opens the round. With no card to review it says "Nothing to review in this deck today." The round opened this way has a Close button that goes back.

#### Scenario: Cards to review
- **WHEN** the deck has 5 cards in today's round and the user taps "Review this deck"
- **THEN** the round opens with "5 words left"

#### Scenario: Nothing today
- **WHEN** the deck has no card in today's round
- **THEN** "Nothing to review in this deck today." shows
