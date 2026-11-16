# Spec Delta

## Purpose
The question screens a new user answers before meeting Kai (O1–O9), and the rule for when onboarding shows.

## ADDED Requirements

### Requirement: Onboarding shows until it is finished
On open, the app SHALL show onboarding (starting at O1) when this install has not finished onboarding, and the tabs when it has. Finishing is remembered on the phone and is cleared by a fresh install.

#### Scenario: First open
- **WHEN** the app opens on a fresh install
- **THEN** O1 "What do you want to learn?" shows, with no tab bar

#### Scenario: Open after finishing
- **WHEN** the user finished onboarding and opens the app again
- **THEN** the tabs show

### Requirement: Top bar and footer on every question screen
Every question screen SHALL show a back button (not on O1), a progress bar and a counter "n/10" (O1 and O1c 1/10, O3 2/10, O4–O6 3/10–5/10, O7 6/10, O8 7/10, O9 8/10), and one green primary button at the bottom. O2 Welcome shows the back button only. Back SHALL return to the previous screen with the earlier answer still selected.

#### Scenario: Back keeps the answer
- **WHEN** the user picks Spanish on O1, continues, then goes back
- **THEN** O1 shows Spanish still selected

### Requirement: O1 and O1c language screens
O1 "What do you want to learn?" SHALL list Spanish, Japanese, Korean, Arabic and Other. O1c "What language do you speak?" SHALL list English, Spanish, Persian, Arabic and Other. One option can be selected. Picking Other SHALL show a text box (O1b). Continue SHALL be off until an option is picked and, for Other, the box has text.

#### Scenario: Pick a listed language
- **WHEN** the user taps Spanish
- **THEN** the row turns green with a filled radio, and Continue is on

#### Scenario: Other needs text
- **WHEN** the user taps Other and the box is empty
- **THEN** Continue is off; after typing "Swedish" it is on

### Requirement: O2 Welcome
O2 SHALL show the Lockwords logo, a phone with a lock-screen word card, Kai, the title "Your words, on your lock screen.", the line "Learn a word every time you unlock." and the button "Get started".

#### Scenario: Continue
- **WHEN** the user taps Get started
- **THEN** O3 shows

### Requirement: O3 Level
O3 SHALL show the title "Your <language> level" and five options with a level mark and a second line: Brand new · Beginner · Some basics · Intermediate · Advanced.

#### Scenario: Title uses the language
- **WHEN** the user picked Spanish on O1
- **THEN** the title is "Your Spanish level"

#### Scenario: Brand new skips the word test
- **WHEN** the user picks Brand new and taps Continue
- **THEN** O8 Goal shows (no word test, no estimate)

### Requirement: O4–O6 Word test
For a language with a test, the app SHALL show three screens "Tap the words you know" (BASIC · 1 OF 3, INTERMEDIATE · 2 OF 3, ADVANCED · 3 OF 3) with the server's words as chips. A tapped chip turns green with a check; tapping again clears it. The right label shows "N SELECTED". The link "I don't know any of these" clears this screen's chips and continues. States: loading (chips area shows a quiet loading line), error (a short message and a "Try again" button), empty and locked do not apply.

#### Scenario: Select and count
- **WHEN** the user taps three chips
- **THEN** the three chips are green and the label reads "3 SELECTED"

#### Scenario: I don't know any
- **WHEN** the user taps "I don't know any of these" on the basic screen
- **THEN** no basic word counts as known and the intermediate screen shows

#### Scenario: Language without a test
- **WHEN** the server says the language has no test
- **THEN** the app goes from O3 to O8 with no word test and no estimate

#### Scenario: Server error
- **WHEN** the word test cannot be loaded
- **THEN** a message and "Try again" show; tapping it loads again

### Requirement: O7 Your estimate
After the advanced screen the app SHALL ask the server for the estimate and show: Kai celebrating, "YOU ALREADY KNOW", "≈ N" with a thousands comma, "of the 5,000 most common <language> words", and the CEFR pill. States: loading (number hidden, quiet loading line), error (message + "Try again").

#### Scenario: Show the estimate
- **WHEN** the server answers `{ knownWords: 1850, outOf: 5000, cefr: "A2+" }`
- **THEN** the screen shows "1,850", "of the 5,000 most common Spanish words" and "A2+"

### Requirement: O8 Goal
O8 "Why are you learning?" SHALL list Travel, Work, Move abroad, Family & friends, Keep my brain active, School and Other, each with an icon. One can be selected. Other shows a text box.

#### Scenario: Pick a goal
- **WHEN** the user taps Travel
- **THEN** Travel is selected and Continue is on

### Requirement: O9 Interests
O9 "What are you into?" SHALL show 24 tiles in three columns (Food, Travel, Work, Business, Tech, Science, Music, Movies, Books, Sports, Fitness, Health, Nature, Animals, Art, Fashion, Gaming, News, Family, Friends & dating, Shopping, Cooking, Money, Culture). Many can be selected. A label shows "N SELECTED". Continue is off with none selected.

#### Scenario: Select tiles
- **WHEN** the user taps Food and Music
- **THEN** both tiles are green with a check and the label reads "2 SELECTED"

### Requirement: Finishing saves the profile
Tapping Continue on O9 SHALL send the answers to the server. On success the app remembers that onboarding is finished and shows the tabs. On failure it stays on O9 and shows "Could not save. Try again." with the button still usable.

#### Scenario: Saved
- **WHEN** the server answers `200`
- **THEN** the tabs show, and the next open goes straight to the tabs

#### Scenario: Save fails
- **WHEN** the server cannot be reached
- **THEN** O9 stays, the message shows, and tapping Continue tries again
