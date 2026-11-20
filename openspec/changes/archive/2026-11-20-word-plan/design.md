## Decisions
- **The plan is kept per learner** (`deck_plans`: `user_id` PK, `items` JSON, `created_at`). Reading it filters out ideas the learner already has a deck for. With three left and a plan under 7 days old, no AI call is made.
- **A failed AI call is not an error for the screen:** the route answers what is left of the kept plan (maybe nothing), and the app hides the section when the list is empty.
- **The fixture planner** takes the fixed first-deck ideas of the learner's goal that they do not have yet, so tests and Maestro are stable.
- **A tap does not make a deck by itself.** It hands the New words chat one message ("A deck about <topic>"), the same path as a learner asking for their own deck. The app keeps that message in a small store (`src/new-words/pending.ts`) until the New words tab is open.
- **The plan loads on its own**, after the numbers: the Progress tab never waits for the AI.
