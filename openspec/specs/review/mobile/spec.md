# review/mobile Specification

## Purpose
The Review tab, the card round, and the one-time screens after the very first round.

## Requirements

### Requirement: Review tab start
The Review tab SHALL load today's round and show: with cards, Kai, "N cards to review today" (or "1 card to review today") and the button "Let’s start"; with no cards, Kai celebrating and "All done for today"; while loading, a quiet loading line; on error, a message and "Try again". Nothing is locked.

#### Scenario: Cards waiting
- **WHEN** the server lists 10 cards
- **THEN** "10 cards to review today" and "Let’s start" show

#### Scenario: Nothing to review
- **WHEN** the server lists no cards
- **THEN** "All done for today" shows and there is no start button

### Requirement: Card round
A round SHALL show one card at a time with no tab bar: a progress bar, "N words left", the deck name, and the card. The front shows the level square, the word, a speaker button and "TAP TO FLIP". Tapping the card flips it. The back shows the word, the translation, the example with the word in green, the example's translation and a "Use it" button. Under the card are three actions: "HARD", "KNOW IT", "EASY".

#### Scenario: Flip
- **WHEN** the user taps the card
- **THEN** the translation and the example show

#### Scenario: Speaker
- **WHEN** the user taps the speaker button
- **THEN** the phone reads the word aloud in the learning language

### Requirement: Swipes
Swiping right or tapping EASY, swiping left or tapping HARD, and swiping up or tapping KNOW IT SHALL send that swipe to the server, show the matching stamp for a moment (EASY with "BACK IN N DAYS", HARD with "GOES TO YOUR LOCK SCREEN", KNOW IT with "WON’T SHOW AGAIN") and move to the next card. When the server answers `again`, the card is added once at the end of the round and "N words left" counts it. If the server cannot be reached, the card stays and "Could not save. Try again." shows. The app sends the phone's time zone with every call.

#### Scenario: Easy
- **WHEN** the user taps EASY on the first of 10 new cards and the server answers back in 3 days
- **THEN** the stamp reads "EASY" and "BACK IN 3 DAYS", then the next card shows with "9 words left"

#### Scenario: Hard comes back
- **WHEN** the user taps HARD on the first of 10 cards and the server answers `again`
- **THEN** the next card shows with "10 words left" and the hard card is the last card of the round

#### Scenario: Save fails
- **WHEN** the server cannot be reached
- **THEN** the same card stays and the message shows

### Requirement: End of a round
After the last card the app SHALL go back to the Review tab. After the very first finished round on this install it SHALL show the one-time screens first (hard words, trial reminder, paywall), once.

#### Scenario: First round
- **WHEN** the user finishes their first round
- **THEN** "Hard words go to your lock screen" shows

#### Scenario: Later rounds
- **WHEN** the user finishes another round
- **THEN** the Review tab shows

### Requirement: Hard words screen
The screen "Hard words go to your lock screen" SHALL show a phone with a lock-screen word card, Kai, and the list "YOUR HARD WORDS · N" from the server (hidden when there are none or the list cannot be loaded), and a Continue button.

#### Scenario: With hard words
- **WHEN** the server lists 2 hard words
- **THEN** "YOUR HARD WORDS · 2" and both words with their translations show
