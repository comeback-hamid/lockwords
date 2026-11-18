## ADDED Requirements

### Requirement: Kai moves
Kai SHALL be drawn live from the character spec (`src/kai/character-spec.json`) in its chat form, at 60 frames a second, and look and move like the same state on `docs/design/CHARACTER.html`. Every chat-form state in the spec SHALL be accepted. A state change SHALL be soft (every pose number moves part of the way to its target each frame, as the spec's `poseSmoothing` says). Kai SHALL blink on its own as the spec's `blink` rule says.

#### Scenario: Same as the design page
- **WHEN** Kai is shown in `greeting`, `idle`, `listening`, `thinking`, `speaking`, `making` (half done), `celebrate`, `waiting` and `oops`, next to the same state on `docs/design/CHARACTER.html`
- **THEN** each pair has the same shape, colors, motion and effect (checked by screenshots in the PR)

#### Scenario: Unknown state
- **WHEN** a screen asks for a state the spec does not have
- **THEN** Kai shows `idle`

### Requirement: One-shot states return
A state with `holdMs` in the spec SHALL play once, hold for `holdMs`, then go to its `returnsTo` state (`previous` = the state before it). A screen that sets a new state during the hold SHALL win.

#### Scenario: Greeting then idle
- **WHEN** a screen shows Kai in `greeting`
- **THEN** Kai waves for 2 seconds, then is in `idle`

#### Scenario: Celebrate then idle
- **WHEN** a screen shows Kai in `celebrate`
- **THEN** after 2.4 seconds Kai is in `idle`

### Requirement: Making shows progress
In `making`, the body SHALL fill from left to right with the progress the screen gives (0 to 1). With no progress given, it follows the spec's `fakeProgress` rule.

#### Scenario: Half done
- **WHEN** Kai is in `making` with progress 0.5
- **THEN** about half of the body's slabs are lit

### Requirement: Reduce Motion
With the phone's Reduce Motion setting on, Kai SHALL show each state's still pose with no loops, no one-shot moves and no effects. State changes still show.

#### Scenario: Reduce Motion
- **WHEN** Reduce Motion is on and Kai is in `greeting`
- **THEN** Kai shows the greeting pose without waving, and goes to `idle` after `holdMs` as usual

## MODIFIED Requirements

### Requirement: Kai chat screen parts
A Kai chat screen SHALL have: a Kai header at the top (one big, live, moving Kai, no page title, no small avatars), messages that scroll under it, Kai's messages as separate bubbles on the left with **bold** key words, the user's messages as green bubbles on the right, and a composer at the bottom.

#### Scenario: Bubbles
- **WHEN** a chat shows a Kai message "Nice to meet you, **Maya**!" and a user message "Maya"
- **THEN** Kai's bubble is on the left with "Maya" in bold, and the user's bubble is green on the right

#### Scenario: Live header
- **WHEN** a chat screen opens
- **THEN** the header shows the live Kai (not a picture), labelled "Kai" for screen readers
