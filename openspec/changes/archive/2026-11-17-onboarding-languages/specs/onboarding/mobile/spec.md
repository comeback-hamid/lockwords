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
On O1 and O1c, tapping Continue with Other SHALL send the typed text to the server's language check. While it runs, Continue SHALL show it is busy and SHALL NOT take a second tap.

#### Scenario: Busy
- **WHEN** the user taps Continue with "swedish" typed and the server has not answered yet
- **THEN** Continue shows it is busy and a second tap sends nothing

### Requirement: A matched language goes on
When the check answers match, the app SHALL save that language and go on: a listed language as the listed choice, any other with the server's English name.

#### Scenario: Typed name of a listed language
- **WHEN** the user types "spanish" and taps Continue, and the server answers match Spanish (`es`)
- **THEN** the learning answer is `{ code: "es", name: "Spanish" }` and O1c shows

#### Scenario: Real language
- **WHEN** the user types "swedish" and the server answers match Swedish (`sv`, not listed)
- **THEN** the learning answer is `{ code: null, name: "Swedish" }` and O1c shows

### Requirement: Did you mean
When the check answers suggestion, the app SHALL stay and show a box "Did you mean <name>?" with the button "Yes, <name>". Tapping it SHALL save that language and go on. Editing the text SHALL hide the box.

#### Scenario: Accept the suggestion
- **WHEN** the user types "spansh" and the server answers suggestion Spanish
- **THEN** "Did you mean Spanish?" shows; tapping "Yes, Spanish" saves Spanish and O1c shows

#### Scenario: Edit instead
- **WHEN** the box shows and the user changes the text
- **THEN** the box goes away

### Requirement: Not recognised pop-up
When the check answers unknown, the app SHALL show a pop-up "We didn't recognise this language. Please check the spelling or pick one from the list." with OK, and stay on the screen with the text kept.

#### Scenario: Not a language
- **WHEN** the user types "qwzx" and the server answers unknown
- **THEN** the pop-up shows with the message and OK, and the app stays on the screen

### Requirement: A failed check does not block
When the check fails (network or server error), the app SHALL save the typed text as typed and go on.

#### Scenario: Check fails
- **WHEN** the server cannot be reached
- **THEN** the typed text is saved as typed and the next screen shows
