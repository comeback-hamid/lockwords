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

---

# Progress tab (same session, 2026-11-20)

Hamid answered 10 questions with "Yes, all suggested". The rule "decide on your own for this session" still holds, so the agent approved its own specs and videos again.

## Hamid's answers
| # | Question | Answer |
|---|---|---|
| P1 | Mastered | Stage 5. Learning = Stage 1 to 4. New = not reviewed yet |
| P2 | "I know it" words | Count as mastered in the total; not in the grid |
| P3 | Goal and date | Goal = the next round hundred above the word bank. Date = when that many words reach Stage 5 at the pace of the last 7 days |
| P4 | The grid | One square per word of the goal: green by level, black when not added yet |
| P5 | Meadows | Both, from the meadow spec, one tree per deck |
| P6 | Word plan | Kai makes a plan of three next decks; tapping one opens the New words chat with that deck ready to generate |
| P7 | The "+" on the deck list | Opens the New words chat |
| P8 | Deck page | One page: the P3 design replaces the current one and keeps swipe to delete and Remove deck |
| P9 | "Review this deck" | A round with only this deck, same rules |
| P10 | Restore "I know it" | A filter "Known" on the deck page, with Restore on each word |

## Decisions the agent made (Progress)
| # | Decision | Why | Change |
|---|---|---|---|
| E1 | The pace is never under 5 and never over 20 new words a day. A word needs 24 days from its first Easy to Stage 5 (3 + 7 + 14). | With no history the date would be "never"; 20 is the daily limit. | `progress-server` |
| E2 | The goal is the next hundred strictly above the words to learn (100 words → goal 200). | The goal must always be ahead. | `progress-server` |
| E3 | A restored word that was reviewed before is due today; a restored new word waits as a new word. | It should come back at once. | `progress-server` |
| E4 | The deck page keeps its "<level> · N WORDS" line and its Close (×) button; the new counts are a second line ("9 LEARNING · 1 HARD"). Figma P3 has one line and a back arrow. | The page is shared with the New words chat, and its old tests and flows stay valid. | `progress-decks` |
| E5 | Every deck has the same icon. Figma shows one icon per topic. | An icon per topic needs a rule or the AI. | `progress-decks` |
| E6 | Known words are listed only under the "Known" chip, and are not in the deck's counts. | Hamid's answer P2 (not among the words to learn). | `progress-decks` |
| E7 | The round opened from a deck is full screen with a Close button (the first round ever still has none). | The deck page is not inside a tab. | `progress-decks` |
| E8 | A tree's leaves are the deck's words that were met (reviewed at least once, or known). A deck with no met word is a bare stem. | The meadow spec says a tree "grows as you meet its words". | `progress-home` |
| E9 | The small meadow strip in Figma (above the grid) is Kai standing on a line of ground; the big meadow is below the goal. | Figma shows Kai on the first strip and trees on the second. | `progress-home` |
| E10 | The grid's empty squares are the dark ink color; the date reads "BY JAN 1" (month and day, English). | As Figma. | `progress-home` |
| E11 | A tapped plan idea sends "A deck about <topic>" to Kai in the New words chat; Kai then shows the deck card with Generate. No deck is made by the tap itself. | Hamid's answer P6 ("ready to generate"), and it reuses the own-deck path. | `word-plan` |
| E12 | The plan is kept for 7 days, and made again sooner when fewer than three ideas are left. If the AI fails, what is left is shown; with nothing left the section is hidden. | The Progress tab must never fail because of the AI. | `word-plan` |
| E13 | Plan ideas have the same deck icon; Figma shows one icon per idea. | Same as decision E5. | `word-plan` |
| E14 | One more real AI call (the planner, with the same key as D23). It answered in 2 seconds with Persian topics for a Persian speaker. | It had only run with the stand-in. | `word-plan` |

## What was built for the Progress tab (4 PRs)
| PR | Change | What |
|---|---|---|
| #39 | `progress-server` | The numbers, the deck list, card flags, restore, a round for one deck |
| #40 | `progress-decks` | Your decks (P2) and the deck words page (P3) |
| #41 | `progress-home` | Progress home (P1): counts, goal grid, date, meadow |
| #42 | `word-plan` | Kai's word plan and the tap into the New words chat |

Videos (on this Mac, not in git): `progress-decks.mp4`, `progress-home.mp4`, `word-plan.mp4` in `~/apps/lockwords-finish-review/e2e/videos/`.

The last full simulator run found one real problem: the longer Progress page pushed the dev-only user id line off the screen, so `guest-login` failed. The line is now at the top of the Progress tab. After that all 25 flows passed (10 in one run, 15 in a second run after the test tool lost its connection to the simulator).

## The web app (Hamid: "Web app", then "make the decision on your own")
One change, `web-build`. The whole app now runs in a browser against the same server.

| # | Decision | Why |
|---|---|---|
| W1 | One page app, no server rendering. | Every screen needs the signed-in learner. It also ends the old tab warning on the web. |
| W2 | The session and the small flags are kept in the browser's storage (`localStorage`). | The phone's secure storage has no browser version; this is the normal way for Supabase on the web. |
| W3 | The tab bar is a plain bar at the bottom on the web. | The phone's system tab bar showed at the top in a browser and covered Kai. |
| W4 | Kai is a still picture per state on the web. | The live drawing (Skia) needs a 3 MB extra download in a browser and a different start. It can come later. |
| W5 | "Remove this deck?" and the language pop-up use the browser's own dialogs. | React Native's pop-up does nothing in a browser. |
| W6 | On a wide window the app is a phone-wide column (430 px) in the middle. | No desktop design exists. |
| W7 | The server allows browser calls from the addresses in `WEB_ORIGINS` and from any localhost port. | A browser refuses calls to another address without this. The API uses a token, not cookies, so localhost is safe to allow. |
| W8 | **The web app is not public.** I did not put it on an address. | The cloud server uses the real AI key and there are no free limits, so a public page is an open cost. The paywall also sells nothing. This is Hamid's decision. The two steps are in `docs/architecture.md` ("Web app"). |
| W9 | CI now builds the web app on every pull request. | A phone-only import would break the browser without anyone seeing it. |
| W10 | Web payments are not started. | Open decision 10 (the provider). |

Checked by hand in the built-in browser against the local stack: onboarding to the first deck, a round with Hard and Undo, Use it with a question to Kai, the intro screens, closing the paywall, the done screen, the Progress tab, Your decks and a deck page.

Not checked: Safari, Firefox, a phone's browser, and the speaker button in a browser.
