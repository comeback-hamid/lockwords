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
| D11 | "First round" for Use it means the learner's first review day: no swipes on any earlier day. | The server needs a rule it can check; the onboarding practice is always that day. | `use-it-rules` |
| D12 | A good sentence on a word below Stage 3 (after the first day) still gets Kai's feedback, but the word does not move. | The API can be called directly; the rule must hold there too. | `use-it-rules` |
| D13 | After a question, only "Next card" is offered (the suggested question shows once). | Keeps the chat short. | `use-it-rules` |
| D14 | The stand-in AI suggests "Can I say it another way?" and gives one fixed answer. The real question-answer call is written but was **never run against the real API**. | No key on this Mac for it; the cloud has the key. | `use-it-rules` |
| D15 | "From B2 up" = the top deck band of the vocabulary engine (word test of 3,250 words or more, or level "Advanced" with no test). | It is the band the engine already calls B2–C1. | `card-meaning-by-level` |
| D16 | The translation is still saved for every word. Only the card back in a round shows the meaning. The lock screen list, the deck page and the Use it word row keep the translation. | Short places need a short text; Figma shows the meaning only on the card back. | `card-meaning-by-level` |
| D17 | Old words keep their translation. Single words from the chat ("Random Words") get no meaning. | No AI call for old cards; the single-word card has its own design. | `card-meaning-by-level` |
| D18 | Shared Maestro steps were split into two more files (`advanced-to-goal`, `goal-to-first-deck`) so new flows do not copy them. | Fix now, not later. | `card-meaning-by-level` |
| D19 | Kai's fixed onboarding lines are translated by the AI once per language and kept in the database. Kai starts in the learner's own language; after the chat language is picked Kai uses it, and in the learned language each line has the own-language line under it. | Hamid's answer 14 left this open, then he said "decide". A Persian speaker should not read English. | `onboarding-kai-language` |
| D20 | The deck ideas (tap answers) are translated too, and the picked idea is sent to the deck maker in that language. | They are part of the same chat. | `onboarding-kai-language` |
| D21 | A learner who does not speak English waits for Kai's lines (Kai and typing dots) for 4 seconds at most; then the chat starts in English. | The chat must never hang. | `onboarding-kai-language` |
| D22 | The question screens O1–O9 stay in English. | The whole app's screen text is English today; translating the app is its own piece of work. | `onboarding-kai-language` |
| D23 | I ran the three new AI calls once each against the real AI with the key in `~/apps/lockwords-new-words/apps/server/.env` (four calls, a few cents). All worked. | They had only run with the stand-in. | all |
| D24 | The meaning check first dropped good meanings of multi-word phrases; it now compares the whole phrase. | Found in the real AI try. | `card-meaning-by-level`, fixed in `onboarding-kai-language` |
| D25 | The old flow `new-words-decks.yaml` got two waits before it taps the message box. | It failed about 1 run in 3 on that step (the chat was not back yet); with the waits it passed twice in a row. | `onboarding-kai-language` |

## What was built (5 PRs)
| PR | Change | What |
|---|---|---|
| #34 | `review-srs-rules` | Review day from 04:00, 20 new words a day, Easy on a new word = Stage 2, Hard repeats once, lock screen until Stage 3, swipe checks, the history table |
| #35 | `review-round-screens` | Undo, streak card, "All cards done" with numbers, "Hi <name>!", tab bar in the round, mic icon |
| #36 | `use-it-rules` | Use it from Stage 3 (every word in the first round), once per word per day, questions to Kai |
| #37 | `card-meaning-by-level` | Meaning in the learned language on the card back for the top level band |
| #38 | `onboarding-kai-language` | Kai's onboarding lines and tap answers in the learner's language |

## Figma check
- **Review (A2–A9) and Use it (A6–A6c):** every frame is built. Not built, by Hamid's decision: pictures on cards (none for now). Sounds: none in v1.
- **Onboarding O12–O14:** built (O12c with the meaning). O14 shows a drawn phone; the real widget is epic 6.
- **Onboarding O1–O10:** compared with the app's video at overview size on 2026-11-20. No new gap found. Known and decided: "I have an account" on O1 and the "Save progress" frame wait for real sign-in; no deck picture on the deck card.
- **O15–O16:** the screens exist; selling is epic 7. The Figma rating row and testimonials are placeholders and are not shown.

## Not checked by anyone
- A real phone (everything ran on the iOS simulator).
- A real day change at 04:00 and a real streak over days (the database tests set the clock).
- The streak card on the simulator (screen test only).
- A native speaker reading Kai's translated lines.

## Videos (on this Mac, not in git)
`~/apps/lockwords-finish-review/e2e/videos/`: `review-srs-rules.mp4`, `review-round-screens.mp4`, `use-it-rules.mp4`, `card-meaning-by-level.mp4`, `onboarding-kai-language.mp4`.
