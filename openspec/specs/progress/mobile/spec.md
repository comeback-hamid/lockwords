# progress/mobile Specification

## Purpose
The Progress tab and the screens it opens: the learner's word bank, their decks and how well they know each word.

## Requirements

### Requirement: Progress page order
The Progress tab SHALL show, from top to bottom: the numbers; a small meadow with Kai; the goal grid with its date and goal; a big meadow; and the decks. While loading it shows a quiet loading line; on error "Could not load your progress." and "Try again". There is no link to a separate decks page and no word plan.

#### Scenario: Order
- **WHEN** the page has loaded
- **THEN** the numbers come first, then the small meadow, the grid, the big meadow and the decks

### Requirement: Numbers and hard words
The Progress tab SHALL show the total ("N words in your word bank"), "N new", "N learning", "N mastered", and a button "N hard words" ("1 hard word") that opens the hard words list. The button shows also with 0.

#### Scenario: Numbers
- **WHEN** the server says 52 words, 30 new, 18 learning, 4 mastered and 3 hard
- **THEN** "52", "30 new", "18 learning", "4 mastered" and "3 hard words" show

#### Scenario: Open the list
- **WHEN** the user taps "3 hard words"
- **THEN** the hard words list opens

### Requirement: Hard words list
The screen "Hard words" SHALL list every hard word from the server with its translation, under "N WORDS · ON YOUR LOCK SCREEN". States: a quiet loading line; an error with "Try again"; with none "No hard words." and "Swipe a word left in Review and it shows here.". Back goes back.

#### Scenario: Three words
- **WHEN** the server lists 3 hard words
- **THEN** "3 WORDS · ON YOUR LOCK SCREEN" and the three words with their translations show

#### Scenario: None
- **WHEN** the server lists no hard word
- **THEN** "No hard words." shows

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
At the bottom the Progress tab SHALL show the title "You have N decks" ("You have 1 deck"; with none "You have no decks yet" and "Ask Kai for one in New words.") and every deck as a deck card, newest first. A card opens that deck's words. When the decks cannot be loaded: "Could not load your decks." and "Try again"; the rest of the page stays.

#### Scenario: Two decks
- **WHEN** the learner has 2 decks
- **THEN** "You have 2 decks" and two deck cards show

#### Scenario: Open a deck
- **WHEN** the user taps a deck card
- **THEN** that deck's page opens

