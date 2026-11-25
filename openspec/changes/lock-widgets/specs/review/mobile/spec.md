## MODIFIED Requirements

### Requirement: Hard words screen
The screen "Hard words go to your lock screen" SHALL show a phone with the lock screen widget as designed in Figma (the word, its meaning, five squares with the first one filled), Kai, the line "Hold your lock screen, tap Customize, then add Lockwords.", and the list "YOUR HARD WORDS · N" from the server (hidden when there are none or the list cannot be loaded), and a Continue button.

#### Scenario: With hard words
- **WHEN** the server lists 2 hard words
- **THEN** "YOUR HARD WORDS · 2" and both words with their translations show, and the phone shows the first one as the widget would

#### Scenario: No hard words
- **WHEN** the learner has no hard words
- **THEN** the phone shows a word of the round just finished and no list
