# progress/mobile Specification

## Purpose
The Progress tab and the screens it opens: the learner's word bank, their decks and how well they know each word.

## Requirements

### Requirement: Progress page order
The Progress tab SHALL show, from top to bottom: the numbers; a small meadow with Kai; the goal grid with its date and goal; a big meadow; and the decks as short rows. While loading it shows a quiet loading line; on error "Could not load your progress." and "Try again". There is no link to a separate decks page and no word plan.

#### Scenario: Order
- **WHEN** the page has loaded
- **THEN** the numbers come first, then the small meadow, the grid, the big meadow and the decks

### Requirement: Numbers
The Progress tab SHALL show the total ("N words in your word bank"), "N new", "N learning" and "N mastered". It shows no hard words number and no way to a hard words page.

#### Scenario: Numbers
- **WHEN** the server says 52 words, 30 new, 18 learning and 4 mastered
- **THEN** "52", "30 new", "18 learning" and "4 mastered" show, and nothing about hard words

### Requirement: Goal grid and date
The Progress tab SHALL show a grid with one square per word of the goal: the server's levels first in the green of their level (a new word in the lightest green), then grey squares for words that have not come yet. Under it: "BY <MONTH DAY>" from the server's date, "you'll master", the goal number and "new <language> words" (or "new words" with no language).

#### Scenario: Numbers
- **WHEN** the server says goal 100, date 2026-12-29, language Spanish and 52 grid levels
- **THEN** "BY DEC 29", "100" and "new Spanish words" show, with 52 level squares and 48 grey squares

#### Scenario: No words yet
- **WHEN** the server says 0 words and goal 100
- **THEN** the grid has 100 grey squares

### Requirement: The small meadow
The small meadow SHALL draw one tree per deck with one leaf block per word of the deck: a met word in the green of its level, a word not met yet in the lightest green. Kai stands next to the trees, alive (idle), and celebrates when tapped. With no decks it still draws one tree, a bare stem.

#### Scenario: Two decks
- **WHEN** the server sends two decks
- **THEN** the meadow says "Your meadow now: 2 trees" and Kai is in it

#### Scenario: No decks
- **WHEN** the server sends no decks
- **THEN** the meadow says "Your meadow now: 1 tree"

### Requirement: The big meadow
The big meadow SHALL draw the forest at the goal: one full tree per 33 words of the goal, three trees at least, bigger than the small meadow's trees. The trees grow in when the page opens, then move in the wind with light running over the leaves, falling leaves and small specks of light. The animation runs on the UI thread. With Reduce Motion the picture stands still.

#### Scenario: Goal of 100
- **WHEN** the goal is 100
- **THEN** the meadow says "Your meadow at the goal: 3 trees"

### Requirement: Decks at the bottom
At the bottom the Progress tab SHALL show the title "You have N decks" with the number in green, and every deck as a short row in one box, newest first: its name, "N words · N learning" (or "N words · all new"), a chain of level squares and an arrow. A row opens that deck's page with its list of words.

#### Scenario: No decks
- **WHEN** the learner has no deck
- **THEN** "You have no decks yet" and "Ask Kai for one in New words." show

#### Scenario: The decks cannot be loaded
- **WHEN** the deck list fails to load
- **THEN** "Could not load your decks." and "Try again" show, and the rest of the page stays

#### Scenario: Two decks
- **WHEN** the learner has a deck of 20 words with 8 learning and a deck of 4 new words
- **THEN** "You have 2 decks", "20 words · 8 learning" and "4 words · all new" show

#### Scenario: Open a deck
- **WHEN** the user taps a deck row
- **THEN** that deck's page opens
