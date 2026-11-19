## ADDED Requirements

### Requirement: Deck ideas in the chat
A Kai message with decks SHALL show them under the bubble as deck cards. Three cards show in a row the user swipes sideways, with page dots. One card shows alone. Cards that are not current show as disabled. Cards follow the translation button.

#### Scenario: Three ideas
- **WHEN** Kai's message has 3 current proposed decks
- **THEN** the first card shows with a Generate button, the next one peeks in from the right, and 3 dots show

#### Scenario: Swipe
- **WHEN** the user swipes the row left
- **THEN** the second card is in the middle and the second dot is dark

### Requirement: Making a deck
Tapping Generate SHALL hide the other cards of that row, show the chosen card as generating, put Kai in `making`, and ask the server to make the deck. While it runs, Generate cannot be tapped on any card. When the deck is ready, the card shows as ready and the app sends the ready event so Kai speaks. If making fails, the cards come back as proposed and a Kai bubble says it did not work and to try again.

#### Scenario: Generate
- **WHEN** the user taps Generate on the second card
- **THEN** only that card shows, in the generating state

#### Scenario: Ready
- **WHEN** the deck becomes ready
- **THEN** the card shows "IN YOUR WORD LIST", Kai's ready lines show, and the options from Kai show

#### Scenario: Fails
- **WHEN** the server answers 502 to generate
- **THEN** the three cards show again with Generate, and Kai says to try again

#### Scenario: Came back later
- **WHEN** the user left during making and opens New words after the deck is ready
- **THEN** the card shows as ready and Kai's ready lines show once

### Requirement: Open the deck
Tapping a ready deck card SHALL open the deck page with its words.

#### Scenario: Tap
- **WHEN** the user taps the ready card
- **THEN** the deck page shows with the deck's title and all its words

### Requirement: Review dot
When a deck becomes ready, the Review tab icon SHALL show a red dot. The dot goes away when the user opens the Review tab. It is kept after a restart.

#### Scenario: Dot
- **WHEN** a deck becomes ready
- **THEN** the Review tab shows a red dot, also after the app restarts

#### Scenario: Seen
- **WHEN** the user opens the Review tab
- **THEN** the dot is gone
