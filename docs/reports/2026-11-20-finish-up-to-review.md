# Finish up to the Review tab: report for Hamid

Session "finish up to review tab", started 2026-11-20. Goal: epics 1 (Onboarding), 2 (Review) and 5 (Use it) done.
Hamid answered 14 questions with "Yes, all suggested", then said: do not ask anything, decide on your own. So both checkpoints (spec approval, video approval) were decided by the agent in this session. Every decision is listed here.

## Hamid's answers (2026-11-20)
| # | Question | Answer |
|---|---|---|
| 1 | New words per day | 20 at most, then "come back tomorrow" |
| 2 | Day change | A word is due for its whole day. A day starts at 04:00 on the phone's clock |
| 3 | Hard in the same round | Comes back once more at the end of the round, and again tomorrow |
| 4 | Leaving the lock screen | A hard word stays until it reaches Stage 3 |
| 5 | Easy on a new word | Stage 2, back in 3 days (as Figma) |
| 6 | Undo and restore | Undo for the last swipe in the round. Restoring older "I know it" words waits for the Progress tab |
| 7 | Streak | A day counts with one swiped word. The card shows once a day, in the middle of the round |
| 8 | Tab bar in the round | Follow Figma (visible). Onboarding practice has no tab bar. No Close button |
| 9 | Sounds | None in v1, only the speaker |
| 10 | Use it from which level | Stage 3 on normal days; always on in the first onboarding round |
| 11 | Use it, how often it counts | A good sentence moves a word up once per day |
| 12 | Follow-up questions in Use it | Yes. Kai answers; the level never changes |
| 13 | Meaning in the learned language | From B2 up |
| 14 | Leftovers | "I have an account" and "Save progress" wait for real sign-in. Kai's lines: see decision D5 |

## Decisions the agent made (please check)
| # | Decision | Why | Change |
|---|---|---|---|
| D1 | Old tests were edited where a rule changed. Each edit only moves an old expectation to the new rule, with a comment. | The edit guard says "ask Hamid"; Hamid said "do not ask, decide". The rules themselves are his answers. | every change, listed in its PR |
| D2 | The time zone comes from the phone on every call (`X-Time-Zone`). No zone = UTC. | The server needs the learner's clock for the 04:00 rule. | `review-srs-rules` |
| D3 | A swipe on a word that is not in today's round answers `409` and changes nothing. | Stops double taps and wrong levels. | `review-srs-rules` |
| D4 | After a first Hard, the second showing takes any swipe. A second Hard does not bring it back a third time. | "Once more" in Hamid's answer. | `review-srs-rules` |
| D5 | The Undo button is small green text "Undo" on the right of the "N words left" line, only right after a swipe. | Figma has no frame for it. | `review-round-screens` |
| D6 | The streak card shows from a streak of 2 days, not on day 1. | "1 day streak" says nothing. | `review-round-screens` |
| D7 | When nothing is due and nothing was swiped today, the Review tab says "Nothing to review today" and "New words from Kai show up here." | Figma A9 only covers the day you did review. | `review-round-screens` |
| D8 | Minutes on the done screen: the time between swipes is added up, and any pause over 60 seconds counts as 60. | No timer in the app; a break should not count. | `review-round-screens` |
| D9 | The very first round (onboarding practice) is full screen with no way out but finishing, as Figma O12. Closing the app and opening it again lands on the Review tab. | Hamid: follow Figma, no Close button. | `review-round-screens` |
| D10 | The Use it button and the chat box got a real mic icon that I drew (the icon set has none). | Figma shows a mic. | `review-round-screens` |
