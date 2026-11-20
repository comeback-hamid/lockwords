# review/mobile Specification

## Purpose
The Review tab, the card round, and the one-time screens after the very first round.

## Requirements

### Requirement: Review tab start
The Review tab SHALL load today's round and the summary and show: with cards, live Kai, "N cards to review today" (or "1 card to review today"), "Hi <name>! It takes about M minutes. Let’s keep your words fresh 🌱" (no "Hi" part without a name) and the button "Let’s start"; with no cards, the done screen; while loading, a quiet loading line; on error, a message and "Try again". Nothing is locked.

#### Scenario: Cards waiting
- **WHEN** the server lists 20 cards and the name is Maya
- **THEN** "20 cards to review today", "Hi Maya! It takes about 5 minutes. Let’s keep your words fresh 🌱" and "Let’s start" show

#### Scenario: Nothing to review
- **WHEN** the server lists no cards
- **THEN** the done screen shows and there is no start button

#### Scenario: Error
- **WHEN** the round cannot be loaded
- **THEN** "Could not load your cards." and "Try again" show

### Requirement: Card round
A round SHALL show one card at a time: a progress bar, "N words left", the deck name, and the card. The tab bar stays visible, except in the very first round on this install. The front shows the level square, the word, a speaker button and "TAP TO FLIP"; a tap flips the card. The back shows the word with a speaker button, the translation, the example with the word in green, its translation and a "Use it" button with a mic icon. Under the card: "HARD", "KNOW IT", "EASY".

#### Scenario: Flip
- **WHEN** the user taps the card
- **THEN** the translation and the example show

#### Scenario: Speaker
- **WHEN** the user taps the speaker button on the front or on the back
- **THEN** the phone reads the word aloud in the learning language

#### Scenario: Leaving a round
- **WHEN** the user taps another tab during a round and comes back
- **THEN** the Review tab shows the start screen with the cards that are left

#### Scenario: First round
- **WHEN** the user is in their very first round
- **THEN** the tab bar is hidden

### Requirement: Swipes
Swiping right or tapping EASY, swiping left or tapping HARD, and swiping up or tapping KNOW IT SHALL send that swipe to the server, show its stamp for a moment ("BACK IN N DAYS", "GOES TO YOUR LOCK SCREEN", "WON’T SHOW AGAIN") and move to the next card. When the server answers `again`, the card is added once at the end of the round. If the server cannot be reached, the card stays and "Could not save. Try again." shows. The app sends the phone's time zone with every call.

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
After the last card the app SHALL show the Review tab, which now shows the done screen. After the very first finished round on this install it SHALL show the one-time screens first (hard words, trial reminder, paywall), once.

#### Scenario: First round
- **WHEN** the user finishes their first round
- **THEN** "Hard words go to your lock screen" shows

#### Scenario: Later rounds
- **WHEN** the user finishes another round
- **THEN** "All cards done" shows

### Requirement: Hard words screen
The screen "Hard words go to your lock screen" SHALL show a phone with a lock-screen word card, Kai, and the list "YOUR HARD WORDS · N" from the server (hidden when there are none or the list cannot be loaded), and a Continue button.

#### Scenario: With hard words
- **WHEN** the server lists 2 hard words
- **THEN** "YOUR HARD WORDS · 2" and both words with their translations show

### Requirement: Undo
After a swipe the round SHALL show an "Undo" button until the next swipe. Tapping it asks the server to take the swipe back and shows that card again, front side. A Hard card that was added to the end of the round is removed from the end. If the server refuses or cannot be reached, nothing changes and the button goes away.

#### Scenario: Undo
- **WHEN** the user swipes "la propina" I know it and taps Undo
- **THEN** "la propina" shows again and "N words left" is what it was before the swipe

#### Scenario: No swipe yet
- **WHEN** a round has just started
- **THEN** there is no Undo button

### Requirement: Streak card
Once per review day, after half of the round's cards, the round SHALL show a streak card when the streak is 2 days or more: Kai celebrating, the number, "day streak 🔥", "You came back N days in a row. Keep it going!" and "SWIPE TO CONTINUE". A swipe in any direction or a tap goes on to the next word. It sends nothing to the server.

#### Scenario: Day 13
- **WHEN** the streak is 13 and the user finishes card 10 of 20
- **THEN** the streak card shows "13" and "day streak 🔥"

#### Scenario: Already shown today
- **WHEN** the user starts a second round the same day
- **THEN** no streak card shows

#### Scenario: First day
- **WHEN** the streak is 1
- **THEN** no streak card shows

### Requirement: Done screen
When today's round is empty and the user swiped at least one word today, the Review tab SHALL show Kai celebrating, "All cards done", "You reviewed every word due today. New reviews will be ready tomorrow.", "N words · M minutes", a chain of level squares (one per word) and the counts "N EASY", "N HARD", "N KNOW IT". With nothing swiped today it shows "Nothing to review today" and "New words from Kai show up here."

#### Scenario: After a round
- **WHEN** the summary says 20 words, 9 minutes, 12 easy, 5 hard, 3 known
- **THEN** "All cards done", "20 words · 9 minutes", 20 squares, "12 EASY", "5 HARD" and "3 KNOW IT" show

#### Scenario: Nothing today
- **WHEN** the round is empty and nothing was swiped today
- **THEN** "Nothing to review today" shows

### Requirement: Use it only when offered
The card back SHALL show the "Use it" button only when the server marks the card with `canUseIt`.

#### Scenario: Offered
- **WHEN** a card with `canUseIt` true is flipped
- **THEN** the "Use it" button shows

#### Scenario: Not offered
- **WHEN** a card with `canUseIt` false is flipped
- **THEN** there is no "Use it" button
