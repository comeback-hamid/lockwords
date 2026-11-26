## ADDED Requirements

### Requirement: Android home screen widget
On Android the app SHALL offer one home screen widget "Lockwords" that shows the learner's hard words with the same plan as the iOS widgets: one entry per 30-minute slot, the look (1 to 5) as five squares, Kai's pose by the look, and "No hard words" or "Open Lockwords" when there is no word to show. It SHALL follow the phone's light or dark look. Android phones have no lock screen widgets, so there is none.

#### Scenario: Small
- **WHEN** the widget is 2 by 2 cells and the current entry is look 1 of "el mesero"
- **THEN** it shows "HARD WORD", "el mesero", "the waiter", one filled square of five and Kai waving

#### Scenario: Medium
- **WHEN** the widget is made 4 cells wide and the current entry is look 3 of "la cuenta" with an example
- **THEN** it also shows the example sentence with "cuenta" in bold, three filled squares and Kai thinking

#### Scenario: The app is closed
- **WHEN** the app handed over a plan and is then closed, and the next slot starts
- **THEN** the widget shows that slot's word without the app being opened

#### Scenario: No hard words
- **WHEN** the plan has no slots
- **THEN** the widget shows "No hard words", "Swipe left in Review" and Kai

#### Scenario: The plan ran out
- **WHEN** the time is after the plan's end
- **THEN** the widget shows "Open Lockwords", "for your hard words"

### Requirement: A tap on the Android widget
A tap anywhere on the Android widget SHALL open the app at `lockwords://review?first=<card id>` for the word it shows, so Review starts on that word, as on iOS.

#### Scenario: Tap on a word
- **WHEN** the widget shows "la cuenta" and the learner taps it
- **THEN** the app opens Review with "la cuenta" as the first card

### Requirement: How to add the widget on Android
On Android the one-time "hard words" screen after the first round SHALL say how to add the home screen widget: "Hold your home screen, tap Widgets, then add Lockwords."

#### Scenario: Android
- **WHEN** an Android learner finishes the first round
- **THEN** the screen shows "Hold your home screen, tap Widgets, then add Lockwords."

#### Scenario: iOS
- **WHEN** an iOS learner finishes the first round
- **THEN** the screen shows "Hold your lock screen, tap Customize, then add Lockwords."
