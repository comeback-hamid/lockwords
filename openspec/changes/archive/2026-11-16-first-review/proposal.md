# Proposal

## Why

A new user has a deck but cannot do anything with it. This change gives the first full loop: review the 10 words with swipes, use a word in a sentence with Kai, see that hard words go to the lock screen, then the trial reminder and the paywall. It is the rest of onboarding (O12–O16) and the core of the Review tab.

Epics: roadmap **1** (O12–O16), **2** Review (`srs-core`, `review-cards`), **5** Use it, **7** Paywall (screens only). One big change, built overnight by the agent because Hamid asked for the whole first run by morning. It is larger than the "about 10 tasks" rule.

## What Changes

- Server: swipe rules (Easy, Hard, I know it) with stages and due dates; today's review list; hard words list; Use it check (AI task with a fixture).
- App: the Review tab shows the start screen (A2) or "all done" (A9). A round (O12/A3–A5) shows one card at a time: tap to flip, swipe or tap Hard / Know it / Easy, with stamps. The speaker button reads the word aloud.
- App: Use it (O13–O13c) as a Kai chat from the card back: write a sentence, thumbs-up, short feedback, "moved up a level".
- App: after the very first round, three one-time screens: O14 "Hard words go to your lock screen", O15 "We’ll remind you before your trial ends", O16 paywall.
- "OK, let’s practice!" in the Kai chat still opens the Review tab; the first round starts from there.

Agent decisions to check:
- Onboarding stays "finished" when the first deck is ready (as merged). Practice is the normal Review round, not a separate onboarding copy. A user who quits mid-practice comes back to the Review tab, not to O1.
- New cards join today's round right away (up to 20), oldest deck first.
- Due times: Easy → up one stage, back in 1 / 3 / 7 / 14 / 30 days (product.md §6). Hard → Stage 1, back tomorrow, marked hard. I know it → never shown again.
- Undo after "I know it" and "Show it again" are not built.
- No card pictures (picture making is a later change). The card has no picture area.
- Use it check without an AI key: "good" when the sentence contains the word (without its article). Real feedback needs the key.
- Use it is offered on every card back, not only from Stage 3 (so the first run can show it). (open) Hamid: keep the Stage 3 rule for normal days?
- Paywall: plans and prices from Figma ($39.99 a year, $6.99 a month, 7 days free). **No purchase happens**: RevenueCat is not set up. Both the trial button and the close button go to the app on the free plan.
- The paywall's rating row and testimonials are left out until there are real ones (product.md says they are placeholders).
- O15 has no people picture (not in the repo); Kai stands in.
- "Save your progress" (sign-in) is not built: needs the cloud accounts.

Out of scope: widgets themselves, purchases, streak screen (A7), free-plan limits, pictures, offline review.

Analytics events: none yet (PostHog comes in epic 9).

Figma (file `HSABWihDUDlsVz85aixHiT`): Onboarding O12 `280:1900` · O12b `280:1974` · O12c `280:2092` · O13 `280:2179` · O13b `280:2253` · O13c `280:2335` · O14 `28:757` · O15 `135:1666` · O16 `135:1703`; page Review `233:4121` (A2–A9).

Easy mode: nothing. Other languages: the speaker uses the phone's voice for the learning language when it has one.

## Capabilities

### New Capabilities
- `review/server`: today's cards, swipe rules, hard words.
- `review/mobile`: Review tab start, the card round, the one-time screens after the first round.
- `use-it/server`: checking a sentence and moving the word up.
- `use-it/mobile`: the Use it chat.
- `paywall/mobile`: trial reminder and paywall screens (no purchase yet).

### Modified Capabilities
(none)

## Impact

- Server: new columns on `cards` (`due_at`, `known`, `hard`), new routes, `llm/use-it`.
- App: new package `expo-speech` (native, needs a new dev build). New routes `review/round`, `use-it/[id]`, `intro/*`. `lockwords.introDone` joins `SECURE_KEYS`.
