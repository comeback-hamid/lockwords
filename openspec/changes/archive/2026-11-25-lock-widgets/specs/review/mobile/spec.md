## MODIFIED Requirements

### Requirement: Hard words screen
The screen "Hard words go to your lock screen" SHALL show a phone with the lock screen widget as designed in Figma (the word, its meaning, five squares with the first one filled), Kai, the line "Hold your lock screen, tap Customize, then add Lockwords.", and the list "YOUR HARD WORDS · N" from the server (hidden when there are none or the list cannot be loaded), and a Continue button.

#### Scenario: With hard words
- **WHEN** the server lists 2 hard words
- **THEN** "YOUR HARD WORDS · 2" and both words with their translations show, and the phone shows the first one as the widget would

#### Scenario: No hard words
- **WHEN** the learner has no hard words
- **THEN** the phone shows a word of the round just finished and no list

## ADDED Requirements

### Requirement: A round that starts with a chosen word
When the app is opened with the address `lockwords://review?first=<id>`, the Review tab SHALL skip its start screen and show the round from `GET /v1/review?first=<id>`. A card with `lookOnly` shows "Next" in place of the three swipe buttons and cannot be swiped; "Next" goes to the next card. If a round is already open, the chosen word is put on top of it.

#### Scenario: From the widget
- **WHEN** the app opens with `lockwords://review?first=<id of "la cuenta">`
- **THEN** the round shows "la cuenta" on top with no start screen

#### Scenario: Look card
- **WHEN** the first card has `lookOnly`
- **THEN** it can be flipped, the speaker and Use it work, "Next" shows, and a swipe does nothing
