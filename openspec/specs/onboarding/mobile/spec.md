# onboarding/mobile Specification

## Purpose
The question screens a new user answers before meeting Kai (O1–O9), and the rule for when onboarding shows.

## Requirements

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
Tapping Continue on O9 SHALL send the answers to the server. On success the app shows the Kai chat (O10). On failure it stays on O9 and shows "Could not save. Try again." with the button still usable. Onboarding is remembered as finished only at the end of the Kai chat.

#### Scenario: Saved
- **WHEN** the server answers `200`
- **THEN** the Kai chat shows, and onboarding is not yet marked finished

#### Scenario: Save fails
- **WHEN** the server cannot be reached
- **THEN** O9 stays, the message shows, and tapping Continue tries again

### Requirement: O10 Kai asks the name
The chat SHALL open with Kai saying "Hi! I’m Kai 👋" and "I’ll help you learn **<language>** words. What’s your name?". The user types a name (1–40 characters) and sends it.

#### Scenario: Name
- **WHEN** the user sends "Maya"
- **THEN** Kai says "Nice to meet you, **Maya**! 😊" and "Which language should we chat in?"

### Requirement: O10b Chat language
Kai SHALL offer two reply options: the user's own language and the language they learn. The answer and the name are saved on the server.

#### Scenario: Pick
- **WHEN** the user taps "English"
- **THEN** the name and the chat language are sent to the server, and Kai goes on to explain what he does

#### Scenario: Save fails
- **WHEN** the server cannot be reached
- **THEN** the chat goes on anyway (the app sends them again with the deck request)

### Requirement: O10c What Kai does, pick your words
Kai SHALL explain in short bubbles (decks made for you, review with quick swipes, use them in sentences, hard words go to the lock screen), then say "Let’s start with **10 new words**. What do you want to learn? 🌮" and show the server's four deck ideas as reply options. The composer placeholder is "Or tell me what you need…". If the ideas cannot be loaded, no options show and the user can still type a topic.

#### Scenario: Ideas
- **WHEN** the server answers four ideas
- **THEN** four reply options show with those texts

### Requirement: O10d Deck card and Generate
After a topic is chosen, Kai SHALL say "Good choice! Here’s your first deck 👇", show the proposed deck card, and say "Tap Generate and I will make it for you ✨". If proposing fails, Kai says "I could not reach the server. Tap to try again." with a "Try again" option.

#### Scenario: Proposed
- **WHEN** the user taps "Ordering food" and the server proposes a deck
- **THEN** the deck card shows with its title and a Generate button

### Requirement: O10e Making the deck
Tapping Generate SHALL switch the card to the generating state and Kai SHALL say "Picking the best words for your level… ⏳". If making fails, the card returns to proposed and Kai says "That did not work. Tap Generate to try again."

#### Scenario: Generating
- **WHEN** the user taps Generate
- **THEN** the card shows "Making your deck…" and the Generate button is gone

### Requirement: O10f Deck ready
When the deck is ready the card SHALL switch to ready, and Kai SHALL say "Your deck is **ready**! 🎉 Tap it any time to see the words." and "Shall we practice them now? 💪" with the options "OK, let’s practice!" and "Show me the words first". Either answer marks onboarding finished. "OK, let’s practice!" opens the tabs on Review. "Show me the words first" opens the deck page.

#### Scenario: Practice
- **WHEN** the user taps "OK, let’s practice!"
- **THEN** onboarding is marked finished and the Review tab shows

#### Scenario: Words first
- **WHEN** the user taps "Show me the words first"
- **THEN** onboarding is marked finished and the deck page lists the 10 words with their translations

### Requirement: Deck page
The deck page SHALL show the deck title and its words with translations. States: loading (quiet loading line), error (message + "Try again"). Closing it goes to the tabs.

#### Scenario: List
- **WHEN** the deck has 10 cards
- **THEN** 10 rows show, each with the word and its translation
