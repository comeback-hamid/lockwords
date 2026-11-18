## MODIFIED Requirements

### Requirement: O2 Welcome
O2 SHALL show the Lockwords logo, a phone with a lock-screen word card, Kai, the title "Your words, on your lock screen.", the line "Learn a word every time you unlock." and the button "Get started". Kai SHALL wave (`greeting`) when the screen opens, then rest (`idle`). Tapping Kai SHALL make it wave again.

#### Scenario: Continue
- **WHEN** the user taps Get started
- **THEN** O3 shows

#### Scenario: Kai waves
- **WHEN** O2 opens
- **THEN** Kai is in `greeting`, and in `idle` after 2 seconds

#### Scenario: Tap Kai
- **WHEN** the user taps Kai while it rests
- **THEN** Kai waves again
