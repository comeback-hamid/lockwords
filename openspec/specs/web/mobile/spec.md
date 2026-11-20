# web/mobile Specification

## Purpose
What the app does differently when it runs in a browser: storage, the tab bar, Kai, pop-ups and the page layout.

## Requirements

### Requirement: The app runs in a browser
The web build SHALL open as one page app and offer the same flows as the phone app: onboarding, New words, Review, Progress, decks and Use it, against the same server. On a wide window the app is a column at most 430 px wide in the middle.

#### Scenario: First visit
- **WHEN** a person opens the web app for the first time
- **THEN** the first onboarding screen shows and no error is shown

#### Scenario: Wide window
- **WHEN** the window is 1200 px wide
- **THEN** the app's column is 430 px wide and centered

### Requirement: Guest session in the browser
On the first visit the web app SHALL sign in as a guest and keep the session in the browser's storage, so a reload keeps the same learner. Small app flags (onboarding finished, intro seen, review dot, speech language, streak) are kept the same way.

#### Scenario: Reload
- **WHEN** a learner who finished onboarding reloads the page
- **THEN** the tabs open with the same learner and onboarding does not start again

#### Scenario: No storage
- **WHEN** the browser has no storage (a server render or a blocked store)
- **THEN** reading a value answers nothing and the app does not crash

### Requirement: Tab bar on the web
On the web the tab bar SHALL be at the bottom with New words, Review and Progress, their icons, and the red dot on Review when new words wait. A learner who has not finished onboarding is sent to onboarding, as on the phone.

#### Scenario: Three tabs
- **WHEN** the tabs show in a browser
- **THEN** the bar is at the bottom and does not cover the screen's content

### Requirement: Kai on the web
On the web Kai SHALL be drawn as a still pose for the current state; a state with no pose of its own uses the nearest one. No animation is needed.

#### Scenario: Thinking
- **WHEN** Kai's state is "thinking" in a browser
- **THEN** a Kai picture shows in the header

### Requirement: Pop-ups on the web
A question that needs a yes or no (for example "Remove this deck?") SHALL use the browser's own confirm dialog on the web, and the action runs only when the person agrees. A message with one button uses the browser's alert. On phones the system pop-up is used as before.

#### Scenario: Cancel
- **WHEN** the person cancels the browser's confirm for "Remove this deck?"
- **THEN** the deck is not removed

#### Scenario: Agree
- **WHEN** the person agrees
- **THEN** the deck is removed
