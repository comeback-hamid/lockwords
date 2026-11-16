# Lockwords: product (what is decided)

Date: 2026-11-16. This file lists only what is **decided** and what Hamid **approved** in Figma.
If this file and `product-v1.md` disagree, this file wins.
Where this file and the Figma file disagree, **Figma wins**.

---

## 1. Where things live in this repo

| File | What it is |
|---|---|
| `docs/product.md` | This file. What is decided. Read it first. |
| `docs/product-v1.md` | Older, longer product doc (LOCKWORDS-V1, 2026-11-11). Extra detail: languages, sharing, free vs Pro, AI quality rules. **This file wins** where they disagree. |
| `docs/screens.md` | Every Figma screen with a direct link. |
| `docs/design/CHARACTER.html` | **Kai** spec v1.1 + reference renderer (`createCharacter`). The data part is copied to `apps/mobile/src/kai/character-spec.json`. |
| `apps/mobile/assets/kai/` | 7 still SVG poses of Kai (for widgets and places with no animation). |
| `docs/dev-guide.html` | How we build: stack, repo, agent rules, tests, daily loop, ship. |
| `docs/design/speak-prototype.html` | Motion prototype of the Speak talk. Live: https://claude.ai/artifact/TuHbqVTvMWPC9nemuGa5o7 |
| `docs/design/pixel-meadow.html` | Pixel meadow for My words (grows up to 3,000 words, 100 decks). |
| `docs/design/ILLUSTRATION-STYLE.md` | The one picture style for card and deck pictures. |

Outside the repo (Hamid's research folder `~/research/lockscreen-words/`): watch-only demo (https://claude.ai/artifact/2ZXMtKmbkL2WfDdvGxUcWS), placeholder photos and wallpapers (`design/photos/`), card and deck pictures (`deck-pictures/`).

---|---|
| `START-HERE.md` | This summary. Read it first. |
| `CHARACTER.html` | **Kai**, the pixel character (v1.1). One JSON spec (`#character-spec`) + a reference renderer (`createCharacter`) + a Playground. Two forms: pixel Kai (chat) and sound-bar Kai with eyes (voice talk). 12 + 9 base states and 34 extra animations. The source of truth for Kai. |
| `character-poses/` | 7 still SVG poses of Kai (idle, greeting, thinking, listening, speaking, wordUsed, celebrate). For places with no animation (for example, widgets). |
| `LOCKWORDS-DEV-GUIDE.html` | How we build: stack, repo, agent rules, tests, daily loop, ship. Made 2026-11-16 in the "AI-native software development" thread. |
| `speak-prototype.html` | Motion prototype of the Speak talk (open in a browser). Live copy: https://claude.ai/artifact/TuHbqVTvMWPC9nemuGa5o7 |
| `pixel-meadow.html` | Pixel meadow / forest for My words: grows with words and decks (up to 3,000 words, 100 decks). |
| `ILLUSTRATION-STYLE.md` | The one picture style for card pictures and deck pictures. |

Other places:
- **Figma (approved design):** https://www.figma.com/design/cRusagDF0itPxGEvDtr44K
- **Watch-only demo** (Maya, ~2:40, Kai animated on every page): https://claude.ai/artifact/2ZXMtKmbkL2WfDdvGxUcWS. Source in `../demo/` (`demo.src.html` → `python3 build.py`).
- Sample people photos, wallpapers and app icons: `../design/photos/` (**placeholders**, not real users).
- Card and deck pictures: `../deck-pictures/`.

---

## 2. The app in one paragraph

Lockwords is a **minimal flashcard app for any language**. You get **personal decks** by chatting with **Kai**. You review with **fast swipes** (spaced repetition). Your **hard words live on your lock screen**. **Use it** turns known words into words you can use. **Speak** gives you short voice talks built from your own words.

Win or lose on **trust**: no wrong AI words, no lost cards, no paywall tricks.

---

## 3. Rules that never change

1. **Minimal.** Few buttons. One green primary button per screen.
2. **Swipes always mean the same:** → Easy · ← Hard · ↑ I know it. Tap flips the card.
3. **Personal.** Decks fit the user's level, goal and interests: about 25% easy, 50% at their level, 25% a stretch. High levels get phrases and collocations, never basic words. Every word has a sound button.
4. **SRS under everything.** The server owns the SRS rules.
5. **Quality first.** Every AI card is checked. Say "made for you", not "AI".
6. **Honest pricing.** The price is shown up front. Free limits never get tighter after launch. Cancel takes 2 taps.
7. **No lost cards.** Sync never deletes cards. Deleted decks stay in "Recently deleted" for 30 days.
8. **Kai is our own character.** Never use Anthropic's "Clawd".

---

## 4. App structure

**Tab bar: New words · Review · Speak.**
- My words is a button in the top bar, not a tab. Progress lives inside My words.
- The Speak tab icon is `Icon/24/speak`: 7 pixel bars with 2 eyes.

### Onboarding (Figma page "Onboarding")
O1 I'm learning (with "Other" text box) → O1c I speak → O2 Welcome (lock-screen hook) → O3 Level → O4–O6 Word test (basic, intermediate, advanced) → O7 Your estimate (number only) → O8 Goal → O9 Interests →
**chat with Kai:** O10 hello + your name → O10b chat language (tap: mother tongue or target language) → O10c what Kai does + short deck ideas by level → O10d deck card + Generate → O10e making the deck → O10f deck ready, "Add 10 words to My words", then practice →
O12–O12c practice (same as the Review cards, no tab bar, "10 words left") → O13–O13c Use it → O14 hard words go to the lock screen → O15 trial reminder → O16 paywall.
- The first deck has **10 words**.
- Kai also appears small on Welcome, Your estimate, Use it feedback and the lock-screen step.
- Paywall O16: one scroll page with Kai, a rating row, swipeable testimonials, features, plans and a sticky button. **The testimonials and the 4.8 rating are placeholders.** Use real beta testers before launch.

### New words tab (Figma page "New words", N1–N7)
One ongoing **chat with Kai**.
- N1 chat home: Kai says "I prepared 3 decks". The decks are in a sideways-swipe deck widget with dots, and each card has Create. Tap answers: Make my own deck · How do I say…? · I have a question.
- N2 swiped · N3 making a deck · N4 deck ready (Add to My words / Open) · N5 own deck by talking · N6 "How do I say…?" word card · N7 deck page (swipe left on a word deletes it).
- Chat box = text + mic for now. Photo, link and YouTube come later.

### Review tab (Figma page "Review", A2–A9)
- A2 start: Kai + "20 cards to review today" + Let's start.
- One round = all of today's due cards. Header: progress bar + "N words left" + My words button on the same line. No title, no undo in the header.
- Card front: picture (2:1) on top, level square right before the word, word, 🔊. Back: smaller picture, word, translation (low levels) or meaning in the target language (high levels), example, Use it.
- Swipes show big tilted stamps on the card: Hard (red), Easy (green outline), Know it (dark green, filled).
- **Use it** (A6–A6c) is a Kai chat: Kai shows the word and asks for a sentence → your sentence is a green bubble → **thumbs-up emoji float up (no score)** → Kai gives short feedback bubbles with emoji. Tap answers sit on the right. You can type a question.
- A7 streak: Kai celebrating + "13 day streak".
- A9 all done: Kai celebrating only, no buttons.

### Speak tab (Figma page "Speak", SP1–SP6)
- SP1 first visit only: Kai + "I make talks from your words." + Let's talk + "3-minute talk".
- SP2 topics: big pixel Kai on top, big swipe topic cards (dots + peek), bigger title, small word chips (max 2 rows, then green "+N"), button **Start**.
- Talk pop-up (SP3–SP5): small sound-bar Kai on top, then a chat. Kai's messages show text, a line, a small gray translation, and a speaker button. Your voice messages show a mic icon + length (0:04). Kai reacts with one emoji badge on your bubble. At the bottom: a big green mic (tap to record, tap to send) with a keyboard button on the left, and the words row under the mic. A used word gets a green chip with a check. **No automatic turn-taking.**
- SP6 summary: Kai celebrating, "Nice talk!", the words you used with their level changes, Done. **No feedback box.**
- Pixel Kai is on the tab. Sound-bar Kai appears **only** inside the talk pop-up.
- Free: 1–2 talks a week. Pro: unlimited talks.

### My words (Figma page "My words", M1–M3)
- M1: big total-words number + legend, the **"5 Decks"** button (new `Icon/24/deck` icon, bold 22px), the pixel meadow now and at the goal, a goal grid (1 square per planned word, 10 per row), "by <date> you'll master N", and "Your word plan".
- M2 deck list · M3 deck words.

### Widgets (Figma page "Widgets")
- Lock screen: inline, rectangular 160×72, circular 72×72. **One tint, no color.**
- Home screen: medium 338×158, small 158×158. Full color, buttons work (App Intents).
- The word widget shows hard words first, then the most-due words. Tap opens that card.

---

## 5. Kai chat rules (every chat screen)
Copy the onboarding chat. Check the Onboarding page before designing a new chat screen.
- No page title. One big animated Kai in a **Kai header** at the top (176 tall, soft shadow). Messages scroll under it. Kai changes pose with the chat.
- **No small Kai avatar circles**, not in the top bar and not next to messages.
- Kai talks in **separate short bubbles** on the left, with emoji and **bold** key words. No icon-list boxes.
- When the choices are fixed, show tap answers: gray "Reply option" pills, stacked on the **right**, just above the text box, with the hint "Tap an option, or type your own".
- Deck flow: deck card + Generate → same card while generating → deck widget (tap to open the words; Kai does not print the word list) → "Shall we practice?" → "OK, let's practice!".

---

## 6. SRS

| Swipe | Meaning | Result |
|---|---|---|
| → | Easy | Up one stage |
| ← | Hard | Back to Stage 1 + goes to the lock-screen widget |
| ↑ | I know it | Never shown again. Counts as known. Undo right after the swipe; "Show it again" from the deck. |

Stages come back after: Stage 1 = 1 day · 2 = 3 days · 3 = 7 days (Use it starts here) · 4 = 14 days · 5 / mastered = 30 days.
- A good Use it sentence moves the word up one stage. A weak one keeps it where it is. Only a left swipe sends a word back to Stage 1.
- New words wait in a list. When today's cards are done, up to 20 join by themselves (oldest deck first).
- v1 is online: review needs a connection. The widget still shows the last words it got.

---

## 7. Design system: "Paper & Ink, GitHub greens"
(Figma pages Foundations and Components have the full set: variables, text styles and components.)
- Calm and flat: white cards on a light gray page, 1px lines, green for actions and for how well you know a word. No gradients, no confetti.
- Colors: canvas `#f6f8fa` · surface `#ffffff` · chip `#eff2f5` · line `#d1d9e0` · text `#1f2328` · muted `#59636e` · **button `#1f883d`** · green-text `#116329` · green-bg `#dafbe1` · Hard/error `#d1242f` · Know it `#116329`.
- Word levels (one **Level square**, shaded by level): New `#eff2f5` · S1 `#aceebb` · S2 `#6fdd8b` · S3 `#4ac26b` · S4 `#2da44e` · S5 `#116329`.
- Type: **Mona Sans** (400/500/600). Mono only for numbers and small caps labels.
- Frame 393×852, side margin 20, radius 12 (buttons, cards), 20 (flashcard). Buttons 56 tall. Tap targets ≥ 44.
- Deck progress = a chain of squares (1 per word), never a bar. Loading = a plain bar.
- All Kai art in Figma = instances of the **"Kai"** component set. Never detach it.
- Sample data: Maya, a Spanish speaker learning English. 52 words in 5 decks.

---

## 8. How we build (full detail in `docs/dev-guide.html`)
- **App:** React Native + Expo (TypeScript strict, Expo Router). iOS first, then Android and web.
- **Widgets:** native SwiftUI WidgetKit, added through an Expo config plugin.
- **Kai:** one JSON spec from `CHARACTER.html` → Skia on the phone, canvas on the web, still images on widgets.
- **Server:** Node + Hono + Drizzle + Zod + pg-boss. The SRS lives only on the server.
- **Login:** Supabase Auth only (Apple, Google, email code; guest first).
- **Data, files, hosting:** DigitalOcean Managed Postgres (Frankfurt), Spaces + CDN, App Platform.
- **Speak:** the phone talks to the voice AI directly (WebRTC). The server gives a short-lived key and saves the transcript.
- **Payments:** RevenueCat. **Analytics:** PostHog. **Builds:** Expo EAS.
- **Loop:** spec in a draft PR → tests first → agent builds → fresh agent + CI check → video approval → merge.
- Reminder (2026-11-16 test, VPN off in Iran): Firebase, Expo push, Anthropic and the GitHub API are blocked. Supabase, RevenueCat, PostHog and EAS Update work.

---

## 9. Not decided yet (ask Hamid, do not invent)
1. Final app name (Lockwords is the working name).
2. Launch languages (suggested: Japanese, Korean, Spanish, Quranic Arabic).
3. Final prices and free limits. The current plan is Pro at $6.99/month or $39.99/year with a 7-day trial; this still needs a test.
4. Easy on a brand-new card: Stage 1 or Stage 2.
5. Speak typing mode and more talk animations: designed only in part.
6. Real testimonials and ratings: all current ones are placeholders.
