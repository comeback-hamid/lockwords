## ADDED Requirements

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
