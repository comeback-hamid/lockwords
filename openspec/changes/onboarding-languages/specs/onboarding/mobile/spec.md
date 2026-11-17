## MODIFIED Requirements

### Requirement: O1 and O1c language screens
O1 "What do you want to learn?" and O1c "What language do you speak?" SHALL each list English, Spanish, French, German, Italian, Portuguese, Russian, Arabic, Persian, Turkish, Japanese, Chinese, Korean and then Other, each listed language with its code badge. The list SHALL scroll when it does not fit the screen, and Continue SHALL stay visible. One option can be selected. Picking Other SHALL show a text box (O1b). Continue SHALL be off until an option is picked and, for Other, the box has text. The language picked SHALL reach the server as today: the code for a listed language, the name for a typed one.

#### Scenario: Thirteen languages and Other
- **WHEN** O1 or O1c shows
- **THEN** the 13 languages show in that order, then Other

#### Scenario: Pick a listed language
- **WHEN** the user taps Spanish
- **THEN** the row turns green with a filled radio, and Continue is on

#### Scenario: Other needs text
- **WHEN** the user taps Other and the box is empty
- **THEN** Continue is off; after typing "Swedish" it is on

#### Scenario: Last language reachable
- **WHEN** the screen is too short for the whole list
- **THEN** the user can scroll to Korean and Other, and Continue stays visible

## ADDED Requirements

### Requirement: O1c blocks the language being learned
O1c SHALL NOT accept the language picked on O1. When the picked (or typed and checked) language is the same as the one being learned, Continue SHALL be off and the line "You're learning <language>. Pick the language you already speak." SHALL show.

#### Scenario: Same listed language
- **WHEN** the user picked Spanish on O1 and taps Spanish on O1c
- **THEN** the line "You're learning Spanish. Pick the language you already speak." shows and Continue is off

#### Scenario: Pick another
- **WHEN** the user then taps English
- **THEN** the line goes away and Continue is on

#### Scenario: Typed name is the learned language
- **WHEN** the user learns Spanish, types "spanish" in Other on O1c and taps Continue
- **THEN** the check maps it to Spanish, the same line shows and the app stays on O1c

### Requirement: Typed language is checked
On O1 and O1c, tapping Continue with Other SHALL send the typed text to the server's language check. While it runs, Continue SHALL show it is busy and not take a second tap. Then:
- a listed language → that listed language is picked and the app goes on;
- a real language with the same spelling → it is kept with the server's English name and the app goes on;
- a suggestion → a box "Did you mean <name>?" with the button "Yes, <name>" shows and the app stays; tapping the button picks that language and goes on; editing the text hides the box;
- not a language → a pop-up "We didn't recognise this language. Please check the spelling or pick one from the list." with OK; the app stays with the text kept;
- the check fails (network or server error) → the typed text is kept as typed and the app goes on.

#### Scenario: Typed name of a listed language
- **WHEN** the user types "spanish" and taps Continue, and the server answers match Spanish (`es`)
- **THEN** the learning answer is `{ code: "es", name: "Spanish" }` and O1c shows

#### Scenario: Real language
- **WHEN** the user types "swedish" and the server answers match Swedish (`sv`, not listed)
- **THEN** the learning answer is `{ code: null, name: "Swedish" }` and O1c shows

#### Scenario: Did you mean
- **WHEN** the user types "spansh" and the server answers suggestion Spanish
- **THEN** "Did you mean Spanish?" shows; tapping "Yes, Spanish" saves Spanish and O1c shows

#### Scenario: Not a language
- **WHEN** the user types "qwzx" and the server answers unknown
- **THEN** the pop-up shows with the message and OK, and the app stays on the screen

#### Scenario: Check fails
- **WHEN** the server cannot be reached
- **THEN** the typed text is saved as typed and the next screen shows
