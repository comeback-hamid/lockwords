# widgets/mobile Specification

## Purpose
The iOS widgets in the app: how the app hands the plan of hard words to the widget, what the widget shows, and what a tap does.

## Requirements

### Requirement: The app hands the plan to the widget
On iOS the app SHALL load `GET /v1/widget/plan` and give the slots to the widget as a timeline when the app starts with a signed-in learner, when it comes back to the front, and after a review round. The last timeline entry, at `endsAt`, is the "open the app" entry. A plan with no slots gives one "no hard words" entry. If the load fails the widget keeps what it had. The web app and Android do nothing.

#### Scenario: App opened
- **WHEN** the learner opens the app and the plan has 12 slots
- **THEN** the widget timeline has 12 word entries and one "open the app" entry

#### Scenario: No connection
- **WHEN** the plan cannot be loaded
- **THEN** the widget timeline is not changed and no error shows

### Requirement: Lock screen widgets
The widget "Lockwords" SHALL offer two lock screen sizes that follow Figma "Widgets" (v1 frames): rectangular and inline. It shows hard words only, and never a number of cards. They use no color and have no buttons. A word or meaning that is too long gets a smaller font, then is cut with "…".

#### Scenario: Rectangular
- **WHEN** the current slot is a word
- **THEN** the widget shows the word, its meaning, five squares with one filled per look so far, and Kai in one color

#### Scenario: Long text has no Kai
- **WHEN** the word has more than 12 letters or the meaning more than 14
- **THEN** the rectangular widget shows no Kai and the text uses the whole width

#### Scenario: Kai's pose
- **WHEN** the look is 1, 2, 3, 4 or 5
- **THEN** Kai's pose is greeting, idle, thinking, speaking or celebrate

#### Scenario: Inline
- **WHEN** the current slot is "la cuenta"
- **THEN** the inline widget shows "la cuenta · the bill"

#### Scenario: Third look of a hard word
- **WHEN** the current slot is look 3 of the hard word "la cuenta"
- **THEN** the rectangular widget shows "la cuenta", "the bill", three filled squares of five and Kai thinking

#### Scenario: No hard words
- **WHEN** the plan has no slots, or the widget was added before the app had a plan
- **THEN** it shows "No hard words" and "Swipe left in Review"

#### Scenario: The list ran out
- **WHEN** the time is after `endsAt`
- **THEN** it shows "Open Lockwords" and "for your hard words"

### Requirement: A tap opens Review on that word
A tap on the widget while it shows a word SHALL open the app on the Review tab, inside the round, with that word as the first card. A tap on the "No hard words" or "Open Lockwords" entry opens the Review tab as it is. If the round cannot be loaded, the Review tab shows its own error.

#### Scenario: Tap on a word
- **WHEN** the learner taps the widget while it shows "la cuenta"
- **THEN** the Review tab opens with the card of "la cuenta" on top, front side up, and the rest of today's round under it

#### Scenario: Before the first round is finished
- **WHEN** the learner taps the widget before the onboarding practice round is done
- **THEN** the Review tab opens as it is

#### Scenario: Removed word
- **WHEN** the tapped word was removed
- **THEN** the Review tab opens as it is

### Requirement: Home screen widgets
The widget "Lockwords" SHALL offer a small and a medium home screen size that follow Figma "Widgets" (v1 frames). They follow the phone's light or dark look, use one color on a tinted or clear home screen, and have no buttons. Kai is in color in every word, also a long one. A meaning or example in a right-to-left script is aligned to the right. They show hard words only. A tap opens Review on that word, as on the lock screen.

#### Scenario: Small
- **WHEN** the current slot is look 1 of "el mesero"
- **THEN** the small widget shows "HARD WORD", "el mesero", "the waiter", one filled square of five and Kai waving

#### Scenario: Medium, hard word with a picture
- **WHEN** the current slot is look 3 of the hard word "la cuenta" and its picture is saved
- **THEN** the medium widget shows "HARD WORD", "la cuenta", "the bill", the example with "cuenta" in bold, three filled squares, the picture and Kai thinking

#### Scenario: No picture
- **WHEN** the slot's word has no saved picture
- **THEN** the medium widget shows a big Kai in place of the picture

#### Scenario: Dark
- **WHEN** the phone is in dark mode
- **THEN** the widget uses the dark colors of the Figma dark frame

#### Scenario: No hard words
- **WHEN** the plan has no slots
- **THEN** the widget shows "No hard words", "Swipe left in Review" and Kai

### Requirement: Pictures for the widget
When the app hands over a plan, it SHALL save the picture of each slot's word as a file in the folder shared with the widget, once per picture, and delete the picture files of words that are no longer in the plan. The server's pictures are small already (512×410), so they are saved as they are. A picture that cannot be downloaded is skipped. The app marks the word in the example for bold (`**word**`), the same way the review card finds it.

#### Scenario: Same word twice
- **WHEN** a word is in 5 slots of the plan
- **THEN** its picture is downloaded once

#### Scenario: Download fails
- **WHEN** a picture cannot be downloaded
- **THEN** the plan is still handed over and that word shows with no picture
