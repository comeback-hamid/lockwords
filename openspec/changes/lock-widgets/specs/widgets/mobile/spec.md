## ADDED Requirements

### Requirement: The app hands the plan to the widget
On iOS the app SHALL load `GET /v1/widget/plan` and give the slots to the widget as a timeline when the app starts with a signed-in learner, when it comes back to the front, and after a review round. The last timeline entry, at `endsAt`, is the "open the app" entry. If the load fails the widget keeps what it had. The web app and Android do nothing.

#### Scenario: App opened
- **WHEN** the learner opens the app and the plan has 12 slots
- **THEN** the widget timeline has 12 word entries and one "open the app" entry

#### Scenario: No connection
- **WHEN** the plan cannot be loaded
- **THEN** the widget timeline is not changed and no error shows

### Requirement: Lock screen widgets
The widget "Lockwords" SHALL offer three lock screen sizes that follow Figma "Widgets" (v1 frames): rectangular, circular and inline. They use no color and have no buttons. A word or meaning that is too long gets a smaller font, then is cut with "…".

#### Scenario: Rectangular
- **WHEN** the current slot is a word
- **THEN** the widget shows the word, its meaning, five squares with one filled per look so far, "HARD" if the word is hard, and Kai in one color

#### Scenario: Kai's pose
- **WHEN** the look is 1, 2, 3, 4 or 5
- **THEN** Kai's pose is greeting, idle, thinking, speaking or celebrate

#### Scenario: Circular
- **WHEN** 12 cards are due today
- **THEN** the circular widget shows Kai and "12"

#### Scenario: Inline
- **WHEN** the current slot is "la cuenta"
- **THEN** the inline widget shows "la cuenta · the bill"

#### Scenario: Third look of a hard word
- **WHEN** the current slot is look 3 of the hard word "la cuenta"
- **THEN** the rectangular widget shows "la cuenta", "the bill", three filled squares of five, "HARD" and Kai thinking

#### Scenario: Before the first plan
- **WHEN** the widget was added and the app has no plan yet
- **THEN** it shows "New words wait" and "Open Lockwords"

#### Scenario: The list ran out
- **WHEN** the time is after `endsAt`
- **THEN** the rectangular widget shows "New words wait" and "Open Lockwords", and the circular widget shows Kai with no number

### Requirement: A tap opens the word
A tap on the rectangular or inline widget SHALL open the app on that word: the word's card alone, with flip, speaker and Use it, and an X that goes to the tabs. A tap on the circular widget opens the Review tab. A tap on the "open the app" entry opens the app where it starts. If the word cannot be loaded (removed, or no connection) the app opens the Review tab.

#### Scenario: Tap on a word
- **WHEN** the learner taps the widget while it shows "la cuenta"
- **THEN** the app opens the card of "la cuenta", front side up

#### Scenario: Removed word
- **WHEN** the tapped word was removed
- **THEN** the Review tab opens
