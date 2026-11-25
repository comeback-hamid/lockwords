## ADDED Requirements

### Requirement: Home screen widgets
The widget "Lockwords" SHALL offer a small and a medium home screen size that follow Figma "Widgets" (v1 frames). They follow the phone's light or dark look, use one color on a tinted or clear home screen, and have no buttons. A tap opens the word, as on the lock screen.

#### Scenario: Small
- **WHEN** the current slot is look 1 of "el mesero", not hard
- **THEN** the small widget shows "REVIEW", "el mesero", "the waiter", one filled square of five and Kai waving

#### Scenario: Medium, hard word with a picture
- **WHEN** the current slot is look 3 of the hard word "la cuenta" and its picture is saved
- **THEN** the medium widget shows "HARD WORD", "la cuenta", "the bill", the example, three filled squares, the picture and Kai thinking

#### Scenario: No picture
- **WHEN** the slot's word has no saved picture
- **THEN** the medium widget shows a big Kai in place of the picture

#### Scenario: Dark
- **WHEN** the phone is in dark mode
- **THEN** the widget uses the dark colors of the Figma dark frame

#### Scenario: The list ran out
- **WHEN** the time is after the plan's end
- **THEN** the widget shows "New words wait" and "Open Lockwords"

### Requirement: Pictures for the widget
When the app hands over a plan, it SHALL save the picture of each slot's word as a small file (252 pixels wide and high at most) in the folder shared with the widget, once per word, and delete the files of words that are no longer in the plan. A picture that cannot be downloaded is skipped.

#### Scenario: Same word twice
- **WHEN** a word is in 5 slots of the plan
- **THEN** its picture is downloaded once

#### Scenario: Download fails
- **WHEN** a picture cannot be downloaded
- **THEN** the plan is still handed over and that word shows with no picture
