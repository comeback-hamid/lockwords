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
O1 "What do you want to learn?" and O1c "What language do you speak?" SHALL each list English, Spanish, French, German, Italian, Portuguese, Russian, Arabic, Persian, Turkish, Japanese, Chinese, Korean, then Other, with code badges. The list SHALL scroll; Continue stays visible. One option can be picked. Other SHALL show a text box (O1b). Continue SHALL be off until an option is picked and, for Other, the box has text. The server gets the code for a listed language, the name for a typed one.

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
For a language with a test, the app SHALL show "Tap the words you know" pages with the server's words as chips: BASIC WORDS, INTERMEDIATE WORDS, then ADVANCED and EXPERT WORDS only when the server says so. Each page shows "Only tap words you know the meaning of. Some are made up." and "N SELECTED". A tapped word turns green with no check mark; a reading shows under a word that has one. States: loading, error with "Try again"; empty and locked do not apply.

#### Scenario: Select and count
- **WHEN** the user taps three chips
- **THEN** the three chips have a green background, no check mark, and the label reads "3 SELECTED"

#### Scenario: I don't know any
- **WHEN** the user taps "I don't know any of these" on the BASIC WORDS page
- **THEN** no basic word counts as known and the INTERMEDIATE WORDS page shows

#### Scenario: Short test
- **WHEN** the server answers `next: null` after page B
- **THEN** the result page shows; no ADVANCED page

#### Scenario: Long test
- **WHEN** the server answers `next: "C"` and later `next: "D"`
- **THEN** the ADVANCED WORDS page shows, then the EXPERT WORDS page, then the result

#### Scenario: Words below the screen
- **WHEN** some chips are below the screen and were never on screen
- **THEN** the button reads "See all words ↓" and scrolls down instead of moving on

#### Scenario: Language without a test
- **WHEN** the server says the language has no test
- **THEN** the app goes from O3 to O8 with no word test and no result page

#### Scenario: Server error
- **WHEN** the word test or the next page cannot be loaded
- **THEN** a message and "Try again" show; tapping it loads again

### Requirement: O7 Your estimate
After the last page the app SHALL ask the server for the estimate and show: Kai in the celebrate pose, "YOU ALREADY KNOW", "≈ N" with a thousands comma (or "5,000+"), counting up from 0, "of the 5,000 most common <language> words", the chip "About level X", and "An estimate from your word test." States: loading (number hidden, quiet loading line), error (message + "Try again").

#### Scenario: Show the estimate
- **WHEN** the server answers `{ words: 4700, plus: false, cefr: "C1" }`
- **THEN** the screen shows "≈ 4,700", "of the 5,000 most common Spanish words" and "About level C1"

#### Scenario: Top of the scale
- **WHEN** the server answers `{ words: 5000, plus: true, cefr: "C2" }`
- **THEN** the number reads "5,000+"

#### Scenario: Starting fresh
- **WHEN** the server answers `startingFresh: true`
- **THEN** the screen shows "You're starting fresh" and no number

#### Scenario: A made-up word was ticked
- **WHEN** `fakesTicked` is 1 or more and the result is shown
- **THEN** a short note says some ticked words were made up, so the number was lowered

### Requirement: O8 Goal
O8 "Why are you learning?" SHALL list Travel, Work, Move abroad, Family & friends, Keep my brain active, School and Other, each with an icon. One can be selected. Continue is off until one is selected. Other shows a text box labelled "YOUR REASON" under the list (Figma O8b), up to 80 characters, and Continue stays off until it has text. Empty, loading, error and locked states do not apply.

#### Scenario: Pick a goal
- **WHEN** the user taps Travel
- **THEN** Travel is selected and Continue is on

#### Scenario: Other needs a reason
- **WHEN** the user taps Other
- **THEN** a text box labelled "YOUR REASON" shows and Continue is off

#### Scenario: Other with a reason
- **WHEN** the user taps Other, types "For my grandmother" and taps Continue
- **THEN** the goal `other` with the text "For my grandmother" is kept and O9 Interests shows

#### Scenario: Leaving Other hides the box
- **WHEN** the user taps Other, then taps Work
- **THEN** the text box is gone and Continue is on

### Requirement: O9 Interests
O9 "What are you into?" SHALL show 20 tiles in three columns (Food, Travel, Work, Business, Tech, Science, Music, Movies, Books, Sports, Health, Nature, Animals, Art, News, Family, Friends & dating, Shopping, Money, Culture). The user picks 1 to 5. A label shows "N SELECTED". Continue is off with none selected. Empty, loading and locked states do not apply; the save error is in "Finishing saves the profile".

#### Scenario: Select tiles
- **WHEN** the user taps Food and Music
- **THEN** both tiles are green with a check and the label reads "2 SELECTED"

#### Scenario: Twenty tiles
- **WHEN** O9 shows
- **THEN** there are 20 tiles and none of them is Cooking, Fitness, Fashion or Gaming

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

### Requirement: Try again after guessing
When the server answers `reliable: false` for the first time, the app SHALL show a screen with two buttons before the result: "Try again" (clears every answer and goes back to the BASIC WORDS page) and "Show my result". A second unreliable result shows the number with no such screen.

#### Scenario: First unreliable result
- **WHEN** the estimate answers `reliable: false` for the first time
- **THEN** the Try again screen shows, not the number

#### Scenario: Show my result
- **WHEN** the user taps "Show my result"
- **THEN** the result page shows the number and the made-up words note

#### Scenario: Second try
- **WHEN** the user tapped "Try again" and the new result is unreliable again
- **THEN** the result page shows at once

### Requirement: O9 five picked
When 5 interests are picked, O9 SHALL fade every other tile, make it not tappable (reported as disabled), and show the label "5 OF 5 PICKED" (Figma O9b). A picked tile can still be tapped to unpick it. Then the other tiles can be picked again and the label goes back to "4 SELECTED".

#### Scenario: Fifth pick locks the rest
- **WHEN** the user picks Food, Travel, Music, Movies and Books
- **THEN** the label reads "5 OF 5 PICKED" and every other tile is disabled

#### Scenario: A sixth tap does nothing
- **WHEN** 5 are picked and the user taps Work
- **THEN** Work is not picked and the label still reads "5 OF 5 PICKED"

#### Scenario: Unpick frees the rest
- **WHEN** 5 are picked and the user taps Books
- **THEN** Books is not picked, the label reads "4 SELECTED" and Work can be picked

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
