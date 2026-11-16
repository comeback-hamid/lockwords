> Background only. Copied from `~/research/lockscreen-words/LOCKWORDS-V1.md` on 2026-11-16. `docs/product.md` and Figma win over this file.

# Lockwords v1: the one file

Last update: 2026-11-11 (owner's Figma comments #20–#46 applied; where a comment and the older text disagreed, the comment won). Owner: Hamid. Working name: Lockwords.
**This is the single source of truth.** It merges the PRD (Oct 29), the review research, the Figma decisions and today's funnel design. Older files are listed at the end as archive.

---

## 1. The app in one paragraph
A **minimal flashcard app for any language**. AI makes **personal decks** from a prompt. You review with **fast swipes** (spaced repetition). Your **hard words live on your lock screen**. **Use it** practice turns known words into words you can use.

**The 4 selling points** (same as the funnel): lock screen · your own decks · fast swipe · Use it.
**The key lesson from ~214,000 competitor reviews:** we win or lose on **trust**. Wrong AI words, lost cards and paywall tricks kill these apps. The widget brings people in; decks, SRS and Use it make them stay and pay.

## 2. Rules that never change
1. **Minimal.** Few buttons. One primary button per screen.
2. **Swipes always mean the same thing:** → Easy · ← Hard · ↑ I know it. Tap flips the card.
3. **Personal.** Decks and examples fit the user's level, job, interests and goal.
4. **SRS under everything.**
5. **Quality first.** Every AI card is checked. Say "made for you", not "AI". *(2026-11-11: cards now have one picture each, in the fixed brand illustration style, `brand/ILLUSTRATION-STYLE.md`. This replaces the old "no pictures" rule.)*
6. **Honest pricing.** Price shown before sign-up. Free limits never get tighter after launch.

## 3. Platforms
- iOS, Android, Web. Widgets only on iOS and Android.
- Sign in: Apple, Google, email. Progress syncs.
- AI runs on our server only.
- **Online review in v1 (decided 2026-11-16).** The server owns the SRS rules, like Popcorn; review and swipes need a connection. The widget still shows the last words it received, even offline. Full offline review is a later version.
- **No lost cards.** Sync never deletes cards. Deleted decks stay in "Recently deleted" for 30 days.
- **Export** any deck or all words as CSV. Free.

## 4. Languages at launch
- it is generic all language will be available and content will generate on demand. 
## 5. Onboarding (as designed in Figma, 2026-10-31)

**Changed 2026-11-15 (owner):** the character is named **Kai** (called Sprout before; same pixel seedling). After Interests, the old "Create your first deck" screens are replaced by **one chat with Kai** (Figma: O10–O10f; the old screens sit in a "Removed" row):
1. Kai says hi and asks the user's **name** (typed).
2. Kai asks **which language to chat in**: two tap answers, the mother tongue and the target language.
3. Kai explains what it does (learn words · review with swipes · use them in talks · hard words go to the lock screen), then asks what kind of **10 new words** the user wants. Answers are short suggestions (about 4 words, like ChatGPT suggestions), picked for the user's level and goal; the user can also type.
4. Tapping a suggestion starts making the deck in its own **deck box** (progress, words appear one by one).
5. The deck box shows all 10 words with **"Add 10 words to My words"**.
6. Kai suggests reviewing them → **Start review** → the rest is unchanged (practice, Use it, lock screen step, trial reminder, paywall).
- There is always a suggested answer to tap when a question has fixed choices; free questions (the name) are typed.
- The first deck has **10 words** (later decks can have up to 30).
- Kai also appears small on Welcome, Your estimate, the Use it feedback and the lock screen step.
1. **Languages, two pages (2026-11-11):** first "What do you want to learn?" ("Other" opens a text box; "I have an account" lives here), then "What language do you speak?".
2. **Welcome** (the lock-screen hook), shown *after* the languages so it can use words in the chosen language.
3. **Your level:** self-rated (Brand new · Beginner · Some basics · Intermediate · Advanced). *"Brand new" ("I don't know any words yet") is shown with four gray squares (2026-11-11).* *"Starting from zero" (A0, added 2026-11-02) skips the word test and Use it: they know no words yet.*
4. **Word test, 3 pages:** Basic → Intermediate → Advanced, 20+ words each, "Tap the words you know", plus "I don't know any of these".
5. **Your estimate:** only the big number ("≈ 1,850 of the 5,000 most common Spanish words") and the level pill. *The word memory map was removed here on 2026-11-11.* *Funnel v3 (2026-11-01): the number = dictionary words known among the 5,000 most common (method and sources in funnel/v3/README.md, "Word test"); the word map was removed from the funnel because testers did not understand it.*
6. **Goal:** why you are learning (incl. Other).
7. **Interests:** 20+ options as icon tiles.
8. **Create your first deck:** big prompt cards made from level, words known, interests and goal, each with its own Generate; a fixed "Write your own deck" button → **Describe your deck** (text box) → **Quick check**, one question at a time (like Claude Code) → Generate deck.
9. **Deck ready** (the deck's word list) → **practice the first 10 words** → **Use it** with one word you marked easy → after **Check**, thumbs-up emoji float up, then a **feedback box** (what worked · you can also say · tip).
   *Deck level rule (owner, 2026-11-02, very important): every deck is made for the learner's level, goal and interests. About 25 % easy (a quick win), 50 % right at their level and new to them, 25 % a stretch. Higher levels get mostly collocations, useful phrases and idiomatic expressions, never basic words; beginners get basic, concrete words. Every word and phrase has a sound button (pronunciation for all languages). First practice: a short tutorial (tap to flip, then swipe right / left / up) that the user cannot skip by tapping fast.*
10. **Hard words go to your lock screen** → one **Continue** button (the extra "Show me how" button was removed 2026-11-11).
11. **Trial reminder:** "We'll remind you before your trial ends" (today free · day 5 reminder · day 7 ends, cancel in 2 taps).
12. **Paywall** (end of onboarding): shows the 4 main features: hard words on the lock screen · your own decks from a prompt · fast swipe review · Use it.
- Save progress (Apple / Google / email) is **not** in onboarding; it comes later.
- The first deck is ready before Review, so there is no empty state.
- **Web buyers** (from the funnel) log in and skip the questions. Never ask twice.

## 6. Tabs: Add · Review · Progress (My words = button in the header)
**2026-11-11:** the tab bar has two tabs, **Add** (sparkle icon; was "New") and **Review**. **My words** is no longer a tab: it is a **button** (white, 1px border, rounded, like our other secondary buttons) at the top right of both tabs, with 4 small green squares (different shades) and the number of words in the word bank next to them. The star streak in the header was removed for this version.

### 6.0 Kai tab (PROPOSAL 2026-11-14, would replace Add)
Tabs would become **Kai · Review · Progress**. Kai is a **guided** language assistant, not an empty chat. Figma: page "Assistant (draft)", frames S1–S6; parts in Components › "06 Assistant"; character spec in `design/CHARACTER.html` (Kai, 2026-11-15; the Figma frames now use it: component set "Kai", static poses in `design/character-poses/`).
- **Home (S1):** Kai + a short greeting, 3 big options (**Make a deck** · **Practice my hard words** · **Talk about a topic**), "Deck ideas for you" (the suggestion cards, side-scrolling), and a chat box at the bottom for anything custom (a topic, a link, a YouTube video).
- **Make a deck (S2–S3):** in the chat. Link preview → one quick question at a time (same options as before; tapping an answer sends it) → the deck appears as a real deck card (Start review / See words) and is saved to My words. Quick replies: "Make another deck", "Talk with these words".
- **Talk (S4–S6):** Kai offers 3 topics built from the user's word bank. A ~3-minute talk with a **checklist of 5–8 of the user's words** that tick off when used well; Kai writes in the target language with a small translation; text first, mic optional, pronunciation never scored. Ends with a summary: which words moved up (no feedback box, removed 2026-11-15).
- Kai only does language learning (other requests get a polite redirect).
- **Free:** deck limits as before + 1–2 talks a week. **Pro:** unlimited talks (the main reason to pay).
- **Character (updated 2026-11-15):** Kai, a seedling (fits the forest of decks on My words). Kai is now **Kai**: a green pixel block with two eyes, two small arms, two feet and a seedling leaf on top. Original art. Never use another company's mascot (e.g. Anthropic's Clawd). This replaces the earlier line-art Kai (old pictures stay in `illustrations/sprout/` for reference only).
  - **Voice talks: Kai turns into the sound bars with eyes** (owner's decision 2026-11-15, replaces the earlier "pixel Kai in talks" line). Pixel Kai on the Speak tab; the change to sound bars happens only inside the talk pop-up. See 6.1b.
  - **Full spec: `design/CHARACTER.html`** (one file: shape, colors, every state, timing, and a reference renderer; all numbers are in its JSON block `#character-spec`).
  - **Chat form (12 states):** idle, greeting, listening, thinking, speaking, word used, gentle no, confused, celebrate, nudge, sleeping, offline.
  - **Voice call form (9 states):** when the user starts a voice call, Kai's body splits into **seven sound bars with eyes**: connecting, idle, listening, thinking, speaking, word used, muted, reconnecting, ending. When the call ends the bars join back into Kai (700 ms change). *(The voice call itself is a new idea from 2026-11-15; it is not in the Talk flow above yet.)*
  - Follows the Feel rules: no confetti (celebrate uses rising squares in the 5 word-level greens), no gradients.

### 6.1a New words tab = a chat with Kai (DECIDED 2026-11-15, replaces the list design in 6.1)
Tabs are **New words · Review · Speak** (Speak icon = the sound bars with eyes). **Progress lives inside My words**, not in a tab. Figma: page "New words", frames N1–N7; the old Add screens are in a "Removed" row.
- **One ongoing chat.** Old messages and decks stay above; each day Kai adds a new message at the bottom.
- **Kai opens with decks:** "I prepared 3 decks for you today", then a **deck widget you swipe sideways**, with dots under it. Each card has its own **Create** button. "1 free deck left this week" sits under the widget.
- **Kai follows up:** "Not what you need? Tell me what you want to learn", with tap answers: **Make my own deck · How do I say…? · I have a question**. The user can always keep typing, like in ChatGPT or Claude.
- **Making a deck** happens in the chat: a deck box with progress and the words appearing, then the full list with **Add to My words** and **Open** (the deck page with the word list stays as it was).
- **My own deck** is a conversation: the user says what they need, Kai asks one short question with tap answers, then makes the deck. No form.
- **How do I say…?** Kai answers with a word card (word, sound, meaning, example) and **Add to My words**.
- Chat box now: text + mic only. **Later:** photo of an object or a handwritten list, links, YouTube.

### 6.1b Speak tab + talk pop-up (DECIDED 2026-11-15)
Figma: page "Speak", frames SP1–SP6. Character parts: Components › 06 Assistant › **"Kai · voice"** (morph, connecting, speaking, listening, muted) and Icon/24/mic-off.
- **Speak is a tab** (tab bar shows, no X).
- **SP1 Intro, first visit only (simplified 2026-11-15):** big pixel Kai waving, ONE big line "I make talks from your words." (max 6 words), a **Let's talk** button, and "3-minute talk" in small text under it. Nothing else.
- **SP2 Topics:** "Speak" header + "1 free talk left", big pixel Kai (idle, bob + blink), then **big topic cards you swipe**, with dots and the next card peeking. Each card: icon, "Topic 1 of 5 · 3 min talk", **big title** (28 px) and a one-line prompt, then **words to use as small chips, never more than 2 rows; the rest becomes a green "+N" chip**, and a **Start** button (2026-11-15: was Let's talk).
- **Let's talk opens the talk pop-up** (REDESIGNED 2026-11-15, Praktika-style; replaces the auto-turn version, now in the "Old" row):
  - **Top = small Kai header:** sound-bar Kai (smaller than before), X, topic name, "2:14 left". The chat scrolls under it (shadow).
  - **Middle = a chat.** Kai's message: the target language, then a thin divider, then the translation in small gray text. A small **speaker button** sits next to each Kai message to hear it again. Your message: green bubble; voice messages show a small mic + length (0:04) above the text; your list words are green and bold. **Kai reacts to your message with one emoji** (small round badge on its corner).
  - **Bottom (voice mode, default):** big green mic in the middle ("Tap to talk"); tap → recording (halo pulses with your voice, stop square, "Listening… tap to send"), tap again → sent as a voice message. Keyboard button on the left of the mic. **Words to use** in one row under the mic.
  - **Keyboard mode:** text box above the keyboard, and the **words row sits right above the text box**. The row scrolls sideways.
  - **Word chips:** not used = white with a gray border; used = green background with a check on the left.
  - Timer: 3:00 for all talks; at 0:00 → summary (SP6): Kai celebrates, "Nice talk!", words used, each word's level change, Done. **No feedback box** (removed 2026-11-15).
  - Figma: SP3 Kai speaking · SP4 you talking (voice message) · SP5 typing · SP6 summary. New icon: Icon/24/keyboard.
- **Motion (prototype, updated 2026-11-15 to the chat talk):** `design/speak-prototype.html` (live: https://claude.ai/artifact/TuHbqVTvMWPC9nemuGa5o7; edit `speak-prototype.src.html`, then run `design/build-speak-prototype.py`). Uses the CHARACTER.html renderer. Intro lines fade up 120 ms apart · cards snap 320 ms, Kai nudges on a new card · talk slides up 420 ms · Kai pixel → bars in the header (700 ms), then connecting · Kai thinks (~0.6 s) then speaks: words appear in time, then divider + translation fade in; mic dimmed while Kai talks · your turn: a soft ring breathes around the mic · recording: stop square, green halo follows your voice, Kai listens, live words, list word → green + chip check pop (320 ms) + Kai word used (900 ms) · send → Kai thinks, emoji pops onto your bubble (380 ms overshoot; 👏 if you used a list word), then answers · keyboard: mic area slides away, text box + keyboard slide up (320 ms), word row on top of the text box, empty box shows a mic to go back · last 30 s orange · 0:00: ending, header grows full screen, bars join back into Kai, Kai celebrates on the summary.
- **Later:** a chat (typing) mode for Speak.

## 6.1 Add (get new words)
- Top: a slim **"Describe your own deck"** row → a **full page** with a big text box → 1–2 quick questions, one at a time (not shown every time) → Generate.
- **Two sections (2026-11-11):** **Recently created** (only if there is one; 1–2 decks) and **New suggestions for you**.
- **Suggestions:** 5 cards. Each: level + word count, the prompt, a short reason, Generate, and a **pale background picture** about the topic (made together with the suggestion). At the end of the list: **"5 more suggestions"** adds 5 more below, again and again.
- **Deck progress = a chain of small squares**, one square per word. 30 squares fill one line; a smaller deck stops part-way. A just-made deck is **all gray** (every word is new); squares turn green as words are learned. *While a deck is being made, use a plain progress bar, not squares (the squares mean memory, not loading).*
- **Recently created** deck card looks like the suggestion cards: pale background picture, bold title (the full prompt), the square chain, and a small info line under it.
- All deck titles on cards are **bold**.
- **Deck page:** tap a created deck to see its words (level square · word · meaning). Swipe left on a word to delete it.
- New suggestions daily. A suggestion disappears once generated, or after a few days.
- Generating: the card shows "Making your deck…" → deck saved in My words → its first words go to Review.
- Max **30 words per deck**: words, collocations, useful phrases. Each word gets translation, meaning, 2 personal examples, made once.
- Free limit reached: buttons say **"Next free deck in X days"**. *(The separate weekly-limit sheet screen was removed from the design on 2026-11-11.)*

### 6.2 Review (today's stack)
One stack with all due cards from all decks.

**Front (2026-11-11):** a picture on the top part of the card (2:1), then the level square **right before the word** (bigger, 18 pt, in line with the text), the word (big), 🔊.
**Back (tap):** the same picture, a little smaller · level square + word + 🔊 · translation (low levels) or target-language meaning (high levels) · example · **Use it** button.

| Swipe | Meaning | Result |
|---|---|---|
| → Right | Easy | Up one stage; keeps coming back with growing gaps (1 → 3 → 7 → 14 → 30 days) until mastered |
| ← Left | Hard | Back to Stage 1 + goes to the widget |
| ↑ Up | I know it (dark green) | **Never shown again** in review (decided 2026-11-01: users read it as "skip forever"). Counts as known/mastered in the stats. Safety nets: Undo right after the swipe, and a "Known" mark in the deck's word list with "Show it again" |

- Big tilted stamps show the swipe (Easy / Hard / I know it).
- Accessibility: screen-reader actions for every swipe, plus an optional row of answer buttons (auto-on at very large text).
- Undo in the header.

**Use it (practice card):**
- Appears by itself when a word reaches Stage 3. Also available from any card back.
- The user types a sentence (mic optional; voice only becomes text, **pronunciation is never scored**). Under the box: 2 suggested sentences with the word; tapping one types it in and sends it. *(Funnel v3, 2026-11-02: no score; 👍 float up, then the better version + one tip, unless it is not a sentence.)*
- **No score (decided 2026-11-11).** After Check: thumbs-up emoji float from bottom to top (more for a better sentence). Then a feedback screen: a short title with an emoji ("🎉 Great sentence!"), the user's sentence, and one **feedback box** under it: 👍 what worked · ✨ you can also say · 💡 tip. No red "wrong" screens.
- A good sentence moves the word up a level; a weak one keeps it where it is. A weak sentence never sends a word to Stage 1 (only a left swipe does).
- "Skip the practice" = an underlined text link, never a swipe. Skipping costs nothing.
- Offline or AI down → practice cards are skipped. Never block progress.

**New words joining:** words wait in a waiting list. At inbox zero, up to **20 new words** join by themselves (oldest deck first), within the weekly limit.
**One round (2026-11-11, replaces rounds of 10):** Review is just today's due cards, in one go. The Review header has **no title, no "18 DUE" and no Undo**: only a simple progress bar and "20 words left" under it, counting down, plus the My words button on the right.
**Streak card:** a solid, minimal **flame** icon (not a star), bigger, centered above the very big streak number; small text under it; no weekday boxes. Swipe to collect.
**All done today:** when every due card is reviewed: a celebration ("You reviewed every card due today", e.g. "20 words · 9 minutes", no rounds) with **"Add 20 new words"** and "Make a new deck". *(The old "Study more" screen was replaced by these two screens.)*

### 6.2b Progress tab: Memory journey (CHOSEN 2026-11-14)
A third tab, **Progress**, next to Add and Review. The tab bar is now **Add · Review · Progress**. My words stays as the button in the top corner. Figma: page "Progress (draft)", frames J1 and J2.
- **One big number:** words in long-term memory (for example "64"), with "+9 this week" beside it.
- **The journey:** every word is one square. The squares sit in 6 steps, drawn as 6 columns: New (gray) → 1 day → 3 days → 1 week → 2 weeks → Long-term (darkest green). A good review moves a word one step to the right. Hard sends it back to "1 day". Under the chart: "Each good review moves a word one step to the right".
- **This week card:** moved up · went back · now long-term.
- **Tap a step** to open a sheet with its words and when each one comes back (a "See all N words" link opens the full list).
- **"I know it" words are not counted** in the squares (the app did not teach them).
- **Full list of a step (J3):** a back page with the step name, the word count, and every word sorted by next review ("Tomorrow", "In 2 days"...).
- **First day (J4):** the big number is "0" with a "Day 1" pill. Columns without words are drawn as dashed empty slots, and a card says the first long-term words come in about 4 weeks (1 + 3 + 7 + 14 days of good reviews).
- **Moment of arrival (J5):** when words reach long-term, a full screen shows them as dark green squares, the new total with "+3 today", and "See my progress".
- **Why this one:** it shows words moving every day, even when no word has reached the end, and it explains how the app works.

*Ideas not chosen, kept in the same Figma page in case we want parts later:*
- **Islands:** an island is a block of squares (island 1 = 20 words, every next island = 50). All squares dark green takes the island. Its picture gets color step by step; taken islands stay yours.
- **Ready for real life:** progress against the goal from onboarding ("68% ready for your trip"), topics with "Ready" at 90% strong words, and one "next step" line.

### 6.3 My words (progress + decks + settings)
**New layout (2026-11-14, from the owner's sketch; full page opened from the top-right My words button, back arrow):**
1. Big number = all words in the word bank (0 on day one), with a small 3-color legend under it: very light green = new · green = learning · dark green = mastered (no streak here).
2. **"5 decks >" button** to the deck list (2026-11-15: made prominent, a light-green pill with a green border, 5 small green squares on the left, chevron on the right).
3. **Forest picture, now:** one tree per deck; a small tree = still learning that deck, a big tree = every word mastered. 3 decks = 3 trees.
4. **Goal grid:** one square per word in the onboarding plan (e.g. 100), **20 per row** (a short block). Words being learned at the top in green shades by memory level; every word not started yet is one plain gray.
5. **Goal:** "by Dec 29 · you'll master 100 new Spanish words" (number and date from the onboarding plan).
6. **Forest picture, goal:** the full forest.
7. **Your word plan:** the kind of words in the plan (e.g. Ordering food and paying · Getting around the city · Small talk with locals).
Old forest pictures (replaced): `deck-pictures/forest/` (5 stages in one sheet; `*-clear.png` have a transparent background so they sit on the page color), shown full width.
**Update 2026-11-15:** both forest pictures are now **coded pixel meadows** (same rules as `illustrations/pixel-meadow.html`: 1 tree = 1 deck, 1 leaf block = 1 word, block color = memory level). Top (now) = one small young tree + two sprouts, with **Kai** standing next to them. Bottom (goal) = **three grown trees** (oak, pine, birch), spaced out, not a crowded forest. Built from code, so the real app draws them from the user's decks.

*Older plan below, kept for the deck page and settings details:*
1. **Three numbers:** Total words · New · Mastered, plus the streak.
2. **Word map:** one square per word, shaded by level, **looks like a GitHub contribution graph**. Picture only, not tappable.
3. **"My decks (6)"** button → full-screen deck list. Each row: name · word count · thin progress strip · Share. Swipe left = delete deck (its words leave too).
4. **Deck page:** word list (word · translation · level square, swipe left = delete word), **"+ Add a word"** (type the word → AI fills translation, meaning, 2 examples, audio; the user never types a definition), Share, Delete deck. Any card can be edited.
5. **⚙ Settings:** account, languages, subscription, widget, answer buttons, export, recently deleted.
- No "all words" list. Every word belongs to a deck.

## 7. SRS levels
| State | Comes back after |
|---|---|
| New (waiting) | — |
| Stage 1 | 1 day |
| Stage 2 | 3 days |
| Stage 3 | 7 days (Use it starts here) |
| Stage 4 | 14 days |
| Stage 5 / mastered | 30 days |
| Known (swiped ↑ I know it) | never (retired; can be restored from the deck) |

## 8. Sharing + web deck maker
- **Sharing is the growth engine.** Free and unlimited. A Share button on every deck → link + QR code.
- Web: a teacher signs in free → prompt or link → AI makes the deck → teacher can fix it → share link + QR.
- Student opens the link: app installed → "Add to my decks" (one tap). No app → store first, deck added after install.
- The teacher's words stay; examples are made fresh for each student. The student gets a copy (no sync of later edits).
- Not in v1: teacher dashboard, public deck library.

## 9. Widgets (iOS + Android, lock + home screen)
- **Word widget:** hard words first, then the most-due words. Rotates every 30–60 min. Tap → opens that card.
- **Streak widget:** "★ 12 · 18 due". Tap → Review.

## 10. Free vs Pro
Reviews, swipes, widgets, word map, sharing and export are **always unlimited**.

| Weekly limit (rolling 7 days from sign-up) | Free | Lockwords Pro |
|---|---|---|
| New AI decks (incl. links / YouTube) | 1 | unlimited |
| Shared decks added | unlimited | unlimited |
| New words into the stack | 30 | unlimited (max 20 per unlock) |
| Use it practice | 10 | unlimited |

- **Lockwords Pro:** $6.99/month or $39.99/year ("$3.33 a month · Save 52%"). Headline **"No weekly limits"**. 7-day free trial on both plans.
- Trial: reminder 2 days before it ends; cancel in 2 taps; **one-tap cancel on web too** (hard cancel = "scam" reviews).
- Upgrade prompt only at the moment of need (limit hit, 2nd deck of the week).
- Test a lifetime price in the funnel only.
- Ask for a rating only after a good moment (3rd inbox zero or 7-day streak). Never AI-written reviews.

## 11. AI quality rules
1. Every word is checked against a dictionary / frequency list. A second AI check on every card before it is saved.
2. Level must match. A beginner never gets C2 words.
3. Human-checked starter decks for each launch language.
4. One-tap "Report this card" → hidden for that user at once, fixed for everyone.
5. Track report rate per language; pause new decks in a language above the limit.
6. Filter adult / offensive topics unless asked.

## 12. Later (not v1)
Paste a list → deck · Anki / CSV import · add from any app (share sheet) + Chrome extension · more practice types · onboarding AI chat · teacher dashboard · public library · search in My words · reminders / notifications · dark mode.

---

## 13. Design system (final): "Paper & Ink, GitHub greens"
This is the style you approved on Oct 31 for the funnel. It fits the app because **the word map is a GitHub contribution graph**. Use it for the new Figma so the funnel and app look like one product.
(It replaces "Quiet Paper" in the big Figma file and "ink & moss" in the simple file.)

**Feel:** calm, flat, precise. White cards on a light gray page, 1px lines instead of shadows, green for actions and for how well you know a word. No confetti, no gradients. **Emoji only in Use it feedback** (👍 🎉 ✨ 💡). **Illustrations only in the brand style** (`brand/ILLUSTRATION-STYLE.md`): card pictures, pale suggestion-card backgrounds, and a few hero pictures.

### Colors (GitHub Primer, light)
| Token | Hex | Use |
|---|---|---|
| canvas | `#f6f8fa` | page background |
| surface | `#ffffff` | cards, sheets, inputs |
| chip | `#eff2f5` | chips, sunken areas |
| line | `#d1d9e0` | 1px borders |
| line-strong | `#c5ced7` | input borders, pressed |
| divider | `#e3e8ec` | list separators |
| text | `#1f2328` | main text |
| text-2 | `#3d444d` | secondary text |
| muted | `#59636e` | meta text, labels |
| subtle | `#818b98` | placeholders, disabled |
| **button** | `#1f883d` (pressed `#1c8139`) | primary buttons, white text |
| green-text | `#116329` | green text, pills |
| green-bg | `#dafbe1` | success / selected background |
| **Hard / error / delete** | `#d1242f` (tint `#ffebe9`) | Hard stamp, errors, delete |
| **I know it** | `#116329` (dark green, same as Stage 5; tint `#dafbe1`) | Know-it stamp (filled) and hints. *Was blue until 2026-11-11.* |
| Easy | `#1f883d` | Easy stamp (outline) and hints |

**Word level (word map, level square, progress strips)** — gray + 5 greens from the Primer green scale:
| New | Stage 1 | Stage 2 | Stage 3 | Stage 4 | Stage 5 |
|---|---|---|---|---|---|
| `#eff2f5` | `#aceebb` | `#6fdd8b` | `#4ac26b` | `#2da44e` | `#116329` |

### Type
- **Mona Sans** for everything (use SF Pro on iOS if Mona Sans can't ship). Weights 400 / 500 / 600.
- **Mono** (SF Mono / ui-monospace) only for numbers, counters and small uppercase labels ("18 DUE", "STAGE 3").
- Non-Latin words: Noto Sans JP / KR / SC / Arabic.

| Style | Size / line | Weight | Use |
|---|---|---|---|
| Word XL | 44 / 52 | 600 | card front word |
| Title | 28 / 34 | 600 | screen titles |
| Headline | 22 / 28 | 600 | section heads, card-back translation |
| Body | 17 / 24 | 400 | main text, examples |
| Callout | 15 / 22 | 400 | secondary text, rows |
| Caption | 13 / 18 | 400 | meta |
| Label mono | 12 / 16, +6% tracking, caps | 500 | eyebrows, counters |
| Button | 17 / 22 | 600 | buttons |

### Shape, space, depth
- Frame: iPhone **393 × 852**. Side margin **20**. Spacing steps 4 / 8 / 12 / 16 / 24 / 32 / 48.
- Radius: 6 small badges · **12** buttons, inputs, cards · 16 sheets · 20 flashcard · full for pills.
- Buttons: 56 tall, full width, green, white text. Secondary: white with 1px line border. Text link: underlined.
- Flat. One soft shadow only for the flashcard and sheets: `0 12px 32px -12px rgba(31,35,40,.22)`.
- Tap targets ≥ 44.
- **Word map:** 7 rows like GitHub; new columns grow to the right; scroll sideways. Squares 12 pt, gap 3, radius 2.5. Legend: "New … Mastered".

---

## 14. Screens (status in Figma, 2026-11-11)
| Group | Status | Screens |
|---|---|---|
| Onboarding | **Designed** (25) | I'm learning · Other · I speak · Welcome · Level · Word test ×3 · Your estimate (number only) · Goal · Interests · Create your first deck · Describe your deck · Quick check 1 and 2 · Deck ready · Practice front · Practice back · Practice back (high level) · Use it · Use it checked (thumbs up) · Use it feedback · Hard words → lock screen · Trial reminder · Paywall |
| Add tab | **Designed** (7) | Home (recent + suggestions) · End of list (5 more) · Describe your deck · Question 1 and 2 · Generating · Deck (words) |
| Review | **Designed** (10) | Front · Back · Swipe left Hard · Swipe right Easy · Swipe up Know it · Use it · Use it checked · Use it feedback · Streak card · All done today |
| My words | **Designed** (M1 main, M2 decks, M3 deck words, 2026-11-15) · rest to do | My words (numbers + word map) · My decks · Deck page · Add a word · Edit card · Share · Settings |
| Other | To do | Report card · Open shared deck · Lock/Home Screen widgets · Widget how-to · Save progress (built, parked) · Web deck maker |

Mock pictures used in Figma: `deck-pictures/figma-v2/` (made with the brand illustration prompt).

Card rules that came out of the design rounds: a deck "clip" on the card's top edge; one **level square** right before the word (2026-11-11; it was at the top-right) whose shade shows the level (gray = new, then light → dark green), the same square on the widget and in word rows; card back has no section titles (picture full-bleed on top if any, big word + sound, translation for low levels or target-language meaning for high levels, example with the word in green, green "Use it" at the bottom); swipe hints are plain text.

Sample person: an English speaker learning **Spanish** (A2+) for a trip to Mexico City (Mexican Spanish: el mesero, el menú).
Not in v1 Figma: dark mode, Android layouts, keyboards on input screens.

## 15. Open decisions (only these)
1. **App name** (Lockwords is the working name).
2. **Launch languages** (suggested: Japanese, Korean, Spanish, Quranic Arabic).
3. ~~Use it result~~ decided 2026-11-11: no score, 👍 + feedback box.
4. ~~Pictures~~ decided 2026-11-11: picture on the front and back of every card.
5. **Word font:** all Mona Sans (as above), or a serif just for the word on the card?
6. Easy on a brand-new card: Stage 1 or Stage 2.
7. Tech stack (widgets need native code on iOS and Android either way).
8. Web daily deck limit; web checkout provider; lifetime price amount; hidden abuse guard for Pro.

---

## 16. Where things are
- **Live funnel (current):** https://lockwords-test-w6jwh.netlify.app/v2/ · code `funnel/v2/` · style ref `funnel/v2/design/DESIGN.md`
- **Figma (current, built from scratch 2026-10-31):** https://www.figma.com/design/cRusagDF0itPxGEvDtr44K — pages Cover · Foundations · Components (Core, Icons, Onboarding, Cards & practice, App) · Onboarding (20 frames) · App · New & Review (11 frames). My words tab not designed yet.
- **Research:** `competitor-reviews/COMBINED-REPORT.md` (14 apps) · `own-words-research/REPORT.md` · `glite-reviews/REPORT.md` · `competitor-funnels/REPORT.md`

**Archive (kept, but this file replaces them):** `PRD.md` · `FUNNEL-PLAN.md` · `ADS.md` · `design/` (big 147-screen Figma https://www.figma.com/design/03grjE2wGxTI27a6y8hxvH, HANDOFF.md, DESIGN.md "Quiet Paper") · the purple and Flip7 funnel styles.
