## ADDED Requirements

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
