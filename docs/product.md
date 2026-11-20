# Lockwords — Product

Owner: Hamid. Builder: Fatima. Last big update: 2026-11-16.

This file is the big picture: **why** Lockwords exists, **who** it is for, **what is in v1**, and the rules that never change. It changes rarely.
- Detailed behavior of each feature (requirements + WHEN/THEN scenarios) lives in `openspec/`. Detail is decided when we build that feature.
- **"(open)"** means not decided yet. Do not invent it in code or specs: ask Hamid.
- **What wins:** Figma → this file → every other doc. Background history (not in this repo): `~/research/lockscreen-words/LOCKWORDS-V1.md`. The Netlify web funnel is **not** a source of truth. Ignore it.

| File | What it is |
|---|---|
| `docs/product.md` | This file. What is decided. Read it first. |
| `docs/screens.md` | Every Figma screen with a direct link. Figma: https://www.figma.com/design/HSABWihDUDlsVz85aixHiT |
| `docs/dev-guide.html` | How we build: stack, repo, agent rules, tests, daily loop, ship. |
| `docs/design/CHARACTER.html` | **Kai** spec + reference renderer. Data copied to `apps/mobile/src/kai/character-spec.json`. |
| `apps/mobile/assets/kai/` | 7 still SVG poses of Kai (widgets, places with no animation). |
| `docs/design/speak-prototype.html` | Motion prototype of the Speak talk. |
| `docs/design/pixel-meadow.html` | Pixel meadow for My words. |
| `docs/design/ILLUSTRATION-STYLE.md` | The one picture style for card and deck pictures. |
| `docs/product-review.md` | The Review page in detail (card round, swipes, Use it). The onboarding practice reuses it. |

---

## 1. Problem
People learn new words, then **forget** them. They don't open study apps every day. And the words they do remember, they **can't use** when they speak or write.

Lockwords fixes both, in this order:
1. **Remember** the words, with almost no effort: words on the lock screen + fast swipe review (spaced repetition).
2. **Use** the words: write a sentence with a word (Use it). Voice talks with Kai (Speak) come in a later version.

**Promise:** learn the words you need, keep them, and use them.

## 2. Who it's for
**Anyone learning any language, from any mother tongue.** No single first group.
- Every language works from day one. Decks, meanings and examples are **made on demand** for the user's target language and mother tongue.
- Every deck fits the user's **level, goal and interests**.
- Beginners get simple, concrete words with translations. Higher levels get phrases and collocations, and meanings in the target language.

## 3. Core idea
A **minimal flashcard app for any language**.
- **Kai** (our pixel character) makes **personal decks** with you in a chat.
- You review with **fast swipes**: → Easy · ← Hard · ↑ I know it.
- Your **hard words live on your lock screen**.
- **Use it** turns known words into words you can use. (**Speak**, voice talks with Kai, comes after v1.)

**The key lesson from ~214,000 competitor reviews:** we win or lose on **trust**. Wrong AI words, lost cards and paywall tricks kill these apps. The widget brings people in. Decks, review and practice make them stay and pay.

## 4. Rules that never change
1. **Minimal.** Few buttons. One green primary button per screen.
2. **Swipes always mean the same thing:** → Easy · ← Hard · ↑ I know it. Tap flips the card.
3. **Personal.** Every deck fits level, goal and interests: about 25% easy, 50% at their level and new, 25% a stretch. Every word has a sound button.
4. **SRS under everything.** The server owns the SRS rules. The app never decides them.
5. **Quality first.** Every AI card is checked before it is saved. Say "made for you", not "AI".
6. **Honest pricing.** The price is shown up front. Free limits never get tighter after launch. Cancel takes 2 taps.
7. **No lost cards.** Sync never deletes cards.
8. **Kai is our own character.** Never use another company's mascot.

## 5. Goals
- **Launch:** v1 in about **one week** (target: 2026-11-23). App Store submission + web app.
- **Success metrics** (targets are (open)):
  - Day-7 retention
  - Install → trial
  - Trial → paid
  - Widget added (% of users who add the lock-screen widget)

---

## 6. v1 scope

| In v1 | Not in v1 (later) |
|---|---|
| iOS app + web app | Android |
| Onboarding with level + word test + first deck with Kai | Web-to-app funnel (buy on web, then app) |
| New words tab: chat with Kai, daily deck ideas, own deck by talking | Sharing decks (link / QR) + web deck maker for teachers |
| Kai free questions ("How do I say…?", "I have a question") | Add my own single word |
| Review tab: swipe cards, SRS, Use it | **Speak tab** (3-minute voice talks with Kai): next version |
| Progress tab: My words, progress, decks, deck words | Answering on the widget (Easy / Hard buttons) |
| | Offline review |
| | Photo, link or YouTube → deck |
| Lock-screen + home-screen widgets (iOS) | Easy-mode / other practice types |
| Paywall (soft) + free weekly limits | Dark mode |
| Sign in: Apple, Google, email code | Public deck library, teacher dashboard |

**(open): in v1 or later?** Daily reminder push · Export to CSV · Recently deleted (30 days) · Report this card.

---

## 7. How it works (big picture)
Screen details are in Figma. Behavior details go in `openspec/` when we build each feature.

### 7.1 Onboarding (Figma page "Onboarding")
1. **Languages:** what you want to learn (any language, "Other" = type it) → what language you speak.
2. **Welcome:** the lock-screen hook.
3. **Level:** self-rated (Brand new → Advanced). "Brand new" skips the word test.
4. **Word test (3 pages):** tap the words you know → **Your estimate** (one big number).
5. **Goal** and **Interests.**
6. **Chat with Kai:** your name → chat language → Kai explains what it does → pick a deck idea (or type your own) → Kai makes the **first deck of 10 words**.
7. **Practice** the 10 words → **Use it** with one word → **hard words go to your lock screen**.
8. **Trial reminder** → **Paywall.**
- The paywall is **soft**: closing it starts the free plan. It comes back only when the user hits a limit.
- No sign-in during onboarding. The user starts as a guest.

### 7.2 Tabs: New words · Review · Progress
**Changed 2026-11-16:** v1 has no Speak tab. **My words moves into the tab bar** in Speak's place, as the **Progress** tab (chart icon, `Icon/24/graph`). There is no My words button in the top bar any more. Speak comes back as a tab in a later version.

**New words (Figma page "New words"):** one ongoing **chat with Kai**. **Changed 2026-11-17** (Hamid's voice note and answers).
- **Kai is an agent with memory.** Kai knows the learner's level, goal, interests, their words and the chat history, and saves what the learner says about themselves. Kai never asks for the goal; Kai may guess it.
- **Kai does not always offer decks.** Kai can praise what the learner practiced, talk about one of their words (meaning, use, culture), or lead them to Review. Kai offers deck ideas when the learner asks, or when they practiced and need new words. Always around the learner's words and level, and brief.
- **Deck ideas:** three at a time, as cards with **Generate**. On the first visit Kai asks before showing them. A made deck is **in the word list at once** (no "Add to My words" step). Kai then says it is in Review, the **Review tab gets a red dot**, and the options are "Let's practice" (Kai takes them to Review after one second) and "Make another deck".
- **My own deck:** the learner says what they need; Kai asks at most one short question with tap answers, then shows the deck card. No form.
- **Single words:** Kai answers "How do I say…?" with a word card (word, sound, meaning, example) and the button **Add to Random Words 1**. "Random Words 1" is a deck for single words from the app or daily life. It takes 30 words; then "Random Words 2", and so on.
- **Questions:** free language questions. Kai only helps with language learning.
- **No fixed buttons** for "My own deck", "How do I say…?" or "I have a question". Kai brings them up in the talk.
- **Translation:** every Kai message has a translation under it (a line, then smaller text). One on/off button next to Kai. It starts **on for A1 and A2** learners and **off for B1 and above** (the learner's level, not the deck's). On: messages and deck titles show a translation. Off: none do.
- **Onboarding chat language (decided 2026-11-20):** Kai's first lines are in the learner's own language. After the learner picks a chat language, Kai uses it; in the learned language each line has the learner's-language line under it.
- **Language:** Kai speaks the language being learned, also when the learner writes in their own language. Kai speaks the learner's language only when they ask. A1 and A2 learners are told they may write in their own language.
- Text only for now. A photo of a word comes in a later version. Free limits on this page are not decided yet.
- **Deck size:** the first deck in onboarding has 10 words. A deck made here has **10 to 30 words**; Kai decides the number for each deck (Hamid, 2026-11-17).

**Review (Figma page "Review"):** one stack of all words due today, in one round.
- Card front: picture, level square, word, sound. Back: meaning or translation, example, **Use it**. Learners in the top level band (B2 and above) get the **meaning in the language they learn**; everyone else gets the translation (decided 2026-11-20).
- Swipes: → Easy (up one stage) · ← Hard (back to stage 1 + goes to the lock screen) · ↑ I know it (never shown again, can be restored).
- **Use it** is a short Kai chat: write a sentence with the word → thumbs-up, then short kind feedback. **No score.** Pronunciation is never scored.
- **Undo:** right after a swipe, "Undo" takes that one swipe back (decided 2026-11-20). Bringing back older "I know it" words comes with the Progress tab.
- **Streak:** a day counts when at least one word was swiped. The streak card shows once a day, after half of the round, from a streak of 2 days.
- **All cards done** screen with today's numbers: words, minutes, one level square per word, and Easy / Hard / Know it counts.
- The tab bar stays visible during a round. Only the very first round (the onboarding practice) is full screen.
- **No sounds in v1**, only the speaker button (decided 2026-11-20).
- When today's cards are done, new words join by themselves (up to 20, oldest deck first).

**Progress (Figma page "Progress", P1–P3):** the user's word bank ("My words"), progress and decks.
- Total words, a coded pixel meadow (1 tree per deck, grows with memory), and a goal grid with "by <date> you'll master N".
- Deck list → deck words (swipe left to delete a word).

### 7.3 Kai chat rules (every chat screen)
Copy the onboarding chat. Check the Onboarding page in Figma before designing a new chat screen.
- No page title. One big animated Kai in a **Kai header** at the top. Messages scroll under it. Kai changes pose with the chat.
- **No small Kai avatar circles**, not in the top bar and not next to messages.
- Kai talks in **separate short bubbles** on the left, with emoji and **bold** key words.
- Before every Kai message, three gray dots show for about one second. Several messages come one by one, each with its dots.
- Options are shown only when they help: none (an open question like a name), one, or a few. Never a long list.
- When the choices are fixed, show **tap answers** (stacked on the right, above the text box) with the hint "Tap an option, or type your own". Free questions (like the name) are typed.
- Deck flow: deck card + Generate → same card while generating → deck widget (tap to open the words; Kai does not print the word list) → "Shall we practice?".

### 7.4 Widgets (Figma page "Widgets", iOS only)
- **Lock screen:** inline, rectangular and circular widgets. One tint, no color.
- **Home screen:** small and medium widgets, full color.
- The word widget shows **hard words first**, then the most-due words. Tap opens that card in the app.
- v1 widgets are **see + open only**. No answering on the widget.
- The web app has no widgets.

### 7.5 SRS (owned by the server)
| Stage | Comes back after |
|---|---|
| New (waiting) | — |
| Stage 1 | 1 day |
| Stage 2 | 3 days |
| Stage 3 | 7 days (Use it starts here) |
| Stage 4 | 14 days |
| Stage 5 / mastered | 30 days |
| Known (↑ I know it) | never (can be restored) |

- A good Use it sentence moves a word up one stage, **once per word per day**. A weak one keeps it where it is. Only a left swipe sends a word back to Stage 1.
- **Use it is offered from Stage 3.** In the very first round (the onboarding practice) it is offered on every word (decided 2026-11-20).
- After a good sentence the learner can **ask Kai about the word** (a suggested question, or their own). Questions never change the level.
- v1 is online: review needs a connection. The widget still shows the last words it got.
- **Easy on a brand-new card goes to Stage 2** (back in 3 days). Decided 2026-11-20.
- **A day starts at 04:00 on the learner's clock.** A word is due for its whole day, not from the hour of the last swipe.
- **New words:** at most 20 new words are started per day. The rest wait for the next day.
- **Hard:** the word goes to Stage 1 and comes back **once more at the end of the same round**, then tomorrow. It stays on the lock screen until it reaches Stage 3.
- A swipe counts only for a word that is in today's round. The server keeps a history of every swipe.

---

## 8. Accounts
- Everyone starts as a **guest**.
- **Subscribers:** right after they buy, we ask them to sign in (Apple, Google or email code). If they skip, we ask again **every time they open the app** until they sign in, so they never lose what they paid for.
- **Free users:** stay guests. Signing in is optional (where: (open)).
- Progress syncs across iOS and the web app after sign-in.
- Delete account in the app removes everything.

## 9. Free vs Pro
Reviews, swipes, widgets and Progress are **always unlimited**.

| Weekly limit (rolling 7 days) | Free | Pro |
|---|---|---|
| New decks from Kai | 1 | unlimited |
| New words into review | 30 | unlimited |
| Use it practice | 10 | unlimited |
| Kai questions | unlimited (a limit may come later) | unlimited |

- **Pro price:** about **$4.99 / month** or **$29.99 / year**, 7-day free trial. Final numbers: (open), set before launch.
- **Paywall headline:** "No weekly limits". (When Speak ships, we test it as the main reason to pay.)
- Trial: reminder before it ends; cancel in 2 taps.
- The upgrade prompt shows only at the moment of need (a limit is hit).
- Ask for an App Store rating only after a good moment. Never fake or AI-written reviews.
- (open): web app payment provider.

## 10. AI quality
1. Every word is checked against a dictionary / frequency list, plus a second AI check before it is saved.
2. Level must match. A beginner never gets C2 words.
3. Every word has pronunciation, in every language.
4. Filter adult and offensive topics unless the user asks.
5. AI keys live only on the server.

## 11. Look and feel
"Paper & Ink, GitHub greens". Full set (variables, text styles, components): Figma pages Foundations and Components. In code: `apps/mobile/src/theme/theme.ts`.
- Calm and flat: white cards on a light gray page, 1px lines, green for actions and for how well you know a word. No gradients, no confetti.
- Colors: canvas `#f6f8fa` · surface `#ffffff` · chip `#eff2f5` · line `#d1d9e0` · text `#1f2328` · muted `#59636e` · **button `#1f883d`** · green-text `#116329` · green-bg `#dafbe1` · Hard/error `#d1242f` · Know it `#116329`.
- Word levels (one **level square**, shaded by stage): New `#eff2f5` · S1 `#aceebb` · S2 `#6fdd8b` · S3 `#4ac26b` · S4 `#2da44e` · S5 `#116329`.
- Type: **Mona Sans** (400/500/600). Mono only for numbers and small caps labels.
- Frame 393×852, side margin 20, radius 12 (buttons, cards), 20 (flashcard). Buttons 56 tall. Tap targets ≥ 44.
- Deck progress = a chain of squares (1 per word), never a bar. Loading = a plain bar.
- Kai art = instances of the **"Kai"** component set in Figma. Never detach it. Kai spec: `docs/design/CHARACTER.html`.

---

## 12. Open decisions
1. App name (Lockwords is the working name).
2. Success metric targets.
3. Final prices.
4. In v1 or later: daily reminder push, export to CSV, recently deleted, report this card.
5. Where free users can sign in.
6. Web app payment provider.
7. ~~Easy on a brand-new card~~ decided 2026-11-20: Stage 2.
8. Word font: all Mona Sans, or a serif just for the word on the card.
