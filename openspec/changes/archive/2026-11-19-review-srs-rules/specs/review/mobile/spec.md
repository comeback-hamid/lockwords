## MODIFIED Requirements

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
