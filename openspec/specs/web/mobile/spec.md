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
On the web Kai SHALL move as on the phone: every state of the character spec plays with the same timing, one-shot states (greeting, celebrate, oops and the like) return by themselves, and `talking` and `listening` show over a resting state. Kai is drawn from the same character data and the same step function as on the phone, with no extra download before it shows. With the system's reduced motion setting on, Kai is a still pose for the current state. A Kai that is not on screen (a hidden browser tab, a screen under another screen) does not draw.

#### Scenario: Kai waves on Hello
- **WHEN** a person opens the web app for the first time
- **THEN** Kai on the Hello screen is moving: two pictures of Kai taken one second apart are not the same

#### Scenario: Thinking
- **WHEN** Kai's state is "thinking" in a browser
- **THEN** Kai shows in the header and plays the thinking state

#### Scenario: A one-shot state returns
- **WHEN** Kai plays "celebrate" in a browser
- **THEN** Kai is back in its resting state after the state's time, with no new state sent by the screen

#### Scenario: Reduced motion
- **WHEN** the system's reduced motion setting is on
- **THEN** Kai is a still pose and two pictures taken one second apart are the same

#### Scenario: Hidden tab
- **WHEN** the browser tab is hidden
- **THEN** Kai stops drawing, and continues when the tab shows again

### Requirement: Pop-ups on the web
A question that needs a yes or no (for example "Remove this deck?") SHALL use the browser's own confirm dialog on the web, and the action runs only when the person agrees. A message with one button uses the browser's alert. On phones the system pop-up is used as before.

#### Scenario: Cancel
- **WHEN** the person cancels the browser's confirm for "Remove this deck?"
- **THEN** the deck is not removed

#### Scenario: Agree
- **WHEN** the person agrees
- **THEN** the deck is removed

### Requirement: The meadow on the web
On the web the meadow on Progress SHALL grow in when the page opens and then move in the wind, as on the phone: the same blocks, colors and motion numbers. With the system's reduced motion setting on, it is a still picture. A meadow that is not on screen does not draw.

#### Scenario: The meadow moves
- **WHEN** a learner with at least one deck opens Progress in a browser
- **THEN** the trees grow in, and two pictures of the meadow taken one second apart are not the same

#### Scenario: Reduced motion
- **WHEN** the system's reduced motion setting is on
- **THEN** the meadow is a still picture with every block in its place

### Requirement: A real keyboard on the web
In a browser a chat box SHALL send its text on Enter and make a new line on Shift+Enter. In a review round Space or Enter SHALL flip the card, the left arrow answers Hard, the up arrow Know it, the right arrow Easy, and Backspace or Z takes the last swipe back. The card keys do nothing while the person types in a text box, while a key is pressed with Ctrl, Alt or Cmd, and while another screen is on top of the round. (Built in `fix/web-parity`, 2026-11-25; written here so the spec is whole.)

#### Scenario: Enter sends
- **WHEN** a person types "hola" in a chat box and presses Enter
- **THEN** the message is sent and the box is empty

#### Scenario: Shift+Enter
- **WHEN** a person presses Shift+Enter in a chat box
- **THEN** a new line is added and nothing is sent

#### Scenario: Arrow answers the card
- **WHEN** a round shows a card and the person presses the right arrow
- **THEN** the card is answered Easy and the next card shows

#### Scenario: Keys under another screen
- **WHEN** Use it is open over the round and the person presses the right arrow outside a text box
- **THEN** no card is answered
