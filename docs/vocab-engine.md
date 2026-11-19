# Vocabulary engine: measure what a learner knows, then give them the right words

Portable spec of the method built for the Lockwords funnel v3 (live since 2026-11-01/02). Everything another app needs is here: the meaning of the number, the word lists, the scoring math with copy-ready code, the level labels, how decks pick words for each level, the AI prompt, timing, tests and known limits.

Source of truth for the code (if this file and the code ever disagree, the code wins):
- Word test + scoring: `~/research/lockscreen-words/funnel/v3/index.html`, block `ESTIMATE-START` … `ESTIMATE-END`, plus `skipC`, `showD`, `shownPages`, `setEstimate`.
- Word data: `funnel/v3/vocab/<code>.json` (13 languages), rank tools in `funnel/v3/tools/lemma/` and `funnel/v3/tools/add-k.mjs`.
- Tests: `funnel/v3/tools/test-estimate.mjs`. Tuning after launch: `funnel/v3/tools/analyze-ticks.mjs`.
- Long notes and every number behind each choice: `funnel/v3/README.md`, section "Word test".
- Deck level + AI prompt: `~/apps/lockwords-fn/lib/level.mjs` and `~/apps/lockwords-fn/netlify/functions/lw-ai.mjs` (action `deck`).

---

## 0. The idea in 4 lines

1. The learner taps the words they know on 2–4 short pages of real words mixed with a few **made-up words**.
2. Each real word has a **frequency rank** (how common it is). A small statistics model finds the rank where the learner knows about half the words, and turns that into **"≈ N of the 5,000 most common words"** plus a **CEFR level** (A1–C2).
3. Made-up words catch guessing: each one ticked lowers the result. Many ticked → offer a redo.
4. The number picks a **deck band** (5 bands). The AI then builds each deck for that band: about **25 % easy, 50 % new at their level, 25 % stretch**, with more collocations and phrases at higher levels.

---

## Part 1 — Measuring vocabulary (the word test)

### 1.1 What the number means

- **"≈ N" = how many of the 5,000 most common dictionary words (lemmas) of the language the learner recognises.**
- A **lemma** is a dictionary word with all its forms: *go, goes, went* = 1 word. Never count word forms. (Counting forms was the bug that showed a B2–C1 learner "≈ 20,000".)
- This is the **X_Lex scale** (Meara & Milton 2003). It is the only scale with a CEFR table built from real test scores (Milton & Alexiou 2009).
- It measures **recognition, not use**. People tick about 1.6–2× more words than they can translate (Stubbe 2015). So the copy says "words you recognise", never "words you can use".
- Maximum shown is **"5,000+"**.

### 1.2 The word lists

**One file per language** (`vocab/<code>.json`):

```json
{
  "lang": "en", "unit": "lemma", "U": 5000,
  "source": "FrequencyWords 2018 en_50k (OpenSubtitles 2018)",
  "licence": "CC-BY-SA 4.0 (Hermit Dave)",
  "pages": {
    "A": [ { "w": "time", "r": 63, "k": 62 }, …, { "w": "tarnel", "fake": 1 }, … ],
    "B": [ … ], "C": [ … ], "D": [ … ]
  }
}
```

- `w` = the word as shown. `k` = **lemma frequency rank** (the scorer uses only this). `r` = old word-form rank (reference only). `fake: 1` = made-up word.
- Japanese and Chinese items also have `rd` (hiragana / pinyin), shown small under the word.

**Pages: 20 real + 3 made-up words each, shuffled per user** (seeded by session id, so a reload keeps the order).

| Page | Shown to the user as | Real-word k range (English) | Example real words (en) | Example made-up words (en) |
|---|---|---|---|---|
| A | Basic words | 62 – 797 | time, love, wait, night | tarnel, plosket, fennick |
| B | Intermediate words | 564 – 4,195 | teach, river, ugly, bright | lummock, frunder, pelfish |
| C | Advanced words | 4,649 – 13,424 | freely, ominous, reminder, misfortune | obrastic, contumble, pellucate |
| D | Expert words | 10,596 – 22,155 | avert, discrepancy, tenacious, idly | subvenery, mollifrage, quiddative |

Other languages have the same 4 pages; their k ranges differ (for example Korean page D only reaches k 4,415, see limits).

**How to pick real words** (Phase 1 = hand-picked by Claude Opus from each frequency list, then checked):
- Dictionary forms a learner would know (infinitive verbs, singular nouns).
- Nouns with their article where the language has one (es, pt, it, fr, de), like the decks: *la propina, das Trinkgeld*.
- No names, swear words, function words (the, of, and), numbers, interjections, abbreviations.
- No two words from the same family (not *teach* and *teacher*), no forms of each other.
- No "giveaway" international loanwords that everyone knows from English.

**How to make made-up words:**
- They follow the language's spelling and sound like real words. Page A fakes look easy, page D fakes look learned (*quiddative*).
- None of them may appear in the 50k frequency list, and none may be one letter away from a common real word.
- **A native speaker must check every made-up word and the D page before ads.**

**Instruction on every test page** (all 13 languages): *"Only tap words you know the meaning of. Some are made up."* Telling people that some words are fake makes them more careful (this is what X_Lex and LexTALE do).

### 1.3 How to get k (the lemma rank) for each word

The scorer is only as good as k. Rank errors matter more than the formula (see limits).

**Source:** FrequencyWords by Hermit Dave (github.com/hermitdave/FrequencyWords), from OpenSubtitles 2018, files `content/2018/<lang>/<lang>_50k.txt` (`pt_br` for Portuguese, `zh_cn` for Chinese; Japanese only has the smaller 2016 list). Licence CC BY-SA 4.0: credit "Word frequencies: FrequencyWords by Hermit Dave (CC BY-SA 4.0), from OpenSubtitles".

**Languages with a lemmatizer** (en, de, fr, es, pt, it, ru, ar, fa, tr):
1. Lemmatize the whole 50k list with **simplemma 2.0** (MIT).
2. Sum the counts of all forms of each lemma. Rank the lemmas by that sum, keeping only lemmas the dictionary knows.
3. Build the language's **lemma curve L(F)** = how many different lemmas appear among the top F word forms. Store it as points (`tools/lemma/lemma_curves.json`). English: L(1,000) = 811, L(2,000) = 1,583, L(4,000) = 3,005, L(8,000) = 5,520, L(16,000) = 9,844, L(50,000) = 23,116.
4. For a test word with form rank r and lemma summed-rank equivalent Fp (Fp = the form rank whose L equals the lemma's rank): **k = L(min(Fp, r))**, with log-log interpolation between curve points.
5. **Homographs**: if the lemmatizer merged a different common word into the lemma (Spanish *sujetar* + *sujeto*), use the form rank only: k = L(r). Check by hand every word where r / k > 5.

Examples: en *arrive* r 2,293 → k 692, *tooth* 3,968 → 1,178; tr *arkadaş* 712 → 130; ru *стоять* 1,204 → 277.

**Languages without a lemmatizer** (ja, zh, ko): k = L(r) from the same kind of curve. Uncertainty ±20–30 %. Korean is a lower bound (its list is in eojeol units).

**Learner-list caps** (ja, zh): subtitles make textbook words look rare (箸 chopsticks had k 12,003). Words on a beginner list get **k = min(k, cap)**: JLPT N5 and HSK 1–3 → cap 1,500; JLPT N4 and HSK 4 → cap 3,000. (`tools/lemma/learner_caps.json`; keep the corpus value as `k0`.)

**Uncertainty of k:** ±10 % for en, de, fr, es, pt, ru; ±20–30 % for it, ar, fa, tr, ja, zh; Korean about one level too low.

**A language with no word file** (the user typed any other language): an AI makes 20 words for each of 3 bands (A = 1–1,000, B = 1,000–2,500, C = 2,500–5,000 most common lemmas). Every word on a page gets the geometric middle of its band: **A → k 173, B → 1,581, C → 3,536**. No made-up words. Only the count of ticks per page matters (`packVocab()` in the code below). The same page rules apply (page C is skipped when 3 or fewer B words are ticked): all of page A with C skipped = 850; scoring page C as "shown" with 0 ticks would give 800.

### 1.4 The test flow

1. Self-rated level first: *Starting from zero / Beginner / Some basics / Intermediate / Advanced* (a0 / a1 / a2 / b1 / b2).
   - **a0 ("Starting from zero") skips the whole test.** They know no words yet, and a test would only discourage them.
   - The self-rating is **not** used by the scorer (the prior is the same for everyone). It is only a fallback for the deck level when there is no test.
2. **Page A**, then **page B** (always shown).
3. **Page C** only if **4 or more real B words** were ticked (`skipC`: real B ≤ 3 → skip).
4. **Page D** only if C was shown, the language has a page D, and **15 or more real C words** were ticked (`showD`).
5. Tap a word chip to select it. Selected = dark fill only, no ✓ (a tick makes chips wider and messy).
6. On small phones, if some words are below the screen, the main button reads **"See all words ↓"** and scrolls instead of moving on, until the last word has been on screen. An unseen word counts as "don't know" and would lower the result.
7. Count line under the chips: "N words selected".
8. Score only the pages that were shown. A skipped page is not guessed or added (the model curve already covers it).

### 1.5 The scoring model (step by step)

Notation: for each shown real word i, x_i = ln(k_i), y_i = 1 if ticked. fn = made-up words shown, fk = made-up words ticked.

1. **Knowledge curve** (Rasch-type in log rank): P(know a word of rank k) = 1 / (1 + exp(−a · (θ − ln k))), with **a = 1.75**. θ = ln(R50), where R50 is the rank the learner knows with a 50 % chance.
2. **Guessing (yes-bias)** from the made-up words only: **g = (fk + 1) / (fn + 16)** (posterior mean with a Beta(1, 15) prior). It is fixed before fitting θ. This keeps the result monotone: one more real tick never lowers it, one more made-up tick never raises it.
3. P(tick a real word) = P(know) + (1 − P(know)) · g. P(tick a made-up word) = g.
4. **Prior** on θ: Normal(mean ln 1,200, sd 1.5), the same for everyone.
5. **Posterior** on a grid θ = ln 10 … ln 300,000, step 0.02: log prior + Σ log-likelihood of every real word's tick or no-tick.
6. **Expected words known in the top 5,000**: N(θ) = Σ over k = 1 … 5,000 of P(know k). (Pre-compute N for every grid point once.)
7. **Result** = N(median θ) × (1 − fk / (fn + 2)). The second factor is X_Lex's "hits minus false alarms" penalty, so the number sits on the scale of the CEFR table. 80 % range = N at the 10th and 90th percentiles of θ, times the same factor.
8. **Rounding**: under 1,000 → nearest 50; 1,000 and up → nearest 100; at least 50; raw ≥ 4,900 → **5,000 ("5,000+")**.
9. **0 real words ticked** → result 0 → show "You're starting fresh", no number.
10. **Not reliable** = 3 or more made-up words ticked **and** at least 30 % of the made-up words shown. First time → a redo screen: **Try again** (clear all answers, back to page A) or **Show my result** (show the number). A second unreliable try just shows the number. Never a dead end.

Speed: about 0.3 ms per call.

**Reference code** (JavaScript, no dependencies; this is the live code):

```js
const EST_A = 1.75, EST_U = 5000, EST_GA = 1, EST_GB = 15, EST_MU = Math.log(1200), EST_SD = 1.5;
const EST_TH = []; for (let t = Math.log(10); t <= Math.log(300000) + 1e-9; t += 0.02) EST_TH.push(t);
let EST_NTAB = null;
// N(theta) for every grid point: expected number of the top 5,000 lemmas known
const estN = () => EST_NTAB || (EST_NTAB = EST_TH.map(t => { let s = 0; for (let k = 1; k <= EST_U; k++) s += 1 / (1 + Math.exp(-EST_A * (t - Math.log(k)))); return s; }));

// vocab = the language file; known = { A: [ticked words], B: [...] }; shown = ['A', 'B', 'C'] (pages shown)
function vocabEstimate(vocab, known, shown) {
  const xs = [], ys = []; let fn = 0, fk = 0;
  shown.forEach(pg => {
    const ks = new Set(known[pg] || []);
    (vocab.pages[pg] || []).forEach(it => {
      const y = ks.has(it.w);
      if (it.fake) { fn++; if (y) fk++; return; }
      xs.push(Math.log(it.k || it.r)); ys.push(y);
    });
  });
  const realKnown = ys.filter(Boolean).length, faRate = fn ? fk / fn : 0;
  const reliable = !(fk >= 3 && faRate >= 0.3);              // many made-up words ticked -> offer a redo
  if (!realKnown) return { words: 0, raw: 0, lo: 0, hi: 0, r50: 0, realKnown, fakes: fk, fn, faRate, g: 0, reliable };
  const g = (fk + EST_GA) / (fn + EST_GA + EST_GB);
  const lp = EST_TH.map(t => {
    let ll = -((t - EST_MU) ** 2) / (2 * EST_SD * EST_SD);
    for (let i = 0; i < xs.length; i++) { const p = 1 / (1 + Math.exp(-EST_A * (t - xs[i]))), q = g + (1 - g) * p; ll += Math.log(ys[i] ? q : 1 - q); }
    return ll;
  });
  const top = Math.max(...lp), w = lp.map(x => Math.exp(x - top)), tot = w.reduce((a, b) => a + b, 0);
  const q = f => { let c = 0; for (let i = 0; i < w.length; i++) { c += w[i] / tot; if (c >= f) return i; } return w.length - 1; };
  const NT = estN(), iMed = q(0.5), pen = 1 - fk / (fn + 2);
  const raw = NT[iMed] * pen, lo = NT[q(0.1)] * pen, hi = NT[q(0.9)] * pen;
  let words = raw >= EST_U - 100 ? EST_U : raw < 1000 ? Math.round(raw / 50) * 50 : Math.round(raw / 100) * 100;
  words = Math.max(50, words);                              // shown as "5,000+" when words === EST_U
  return { words, raw: Math.round(raw), lo: Math.round(lo), hi: Math.round(hi), r50: Math.round(Math.exp(EST_TH[iMed])), realKnown, fakes: fk, fn, faRate, g: Math.round(g * 1000) / 1000, reliable };
}

// CEFR label. C2 also needs R50 >= 20,000 (evidence beyond the top 5,000).
const EST_C2_R50 = 20000;
const cefrOf = (n, r50, c2 = EST_C2_R50) => n < 1500 ? 'A1' : n < 2500 ? 'A2' : n < 3250 ? 'B1' : n < 3750 ? 'B2' : (n < 4500 || !(r50 >= c2)) ? 'C1' : 'C2';

// A language with no word file: AI word pack, 3 pages, each word gets its band's middle rank
const EST_PACK_SPAN = { A: [30, 1000], B: [1000, 2500], C: [2500, 5000] };
function packVocab(t) {
  const pages = {};
  Object.keys(EST_PACK_SPAN).forEach(pg => { const [lo, hi] = EST_PACK_SPAN[pg], k = Math.round(Math.sqrt(lo * hi)); pages[pg] = ((t || {})[pg] || []).map(x => ({ w: x, k })); });
  return { unit: 'lemma', U: EST_U, pages };
}

// Adaptive pages
const knownReal = (vocab, known, pg) => { const ks = new Set(known[pg] || []); return (vocab.pages[pg] || []).filter(it => !it.fake && ks.has(it.w)).length; };
const skipC = (vocab, known) => knownReal(vocab, known, 'B') <= 3;
const showD = (vocab, known) => !skipC(vocab, known) && (vocab.pages.D || []).length > 0 && knownReal(vocab, known, 'C') >= 15;
const shownPages = (vocab, known) => ['A', 'B'].concat(skipC(vocab, known) ? [] : ['C'], showD(vocab, known) ? ['D'] : []);
```

### 1.6 Level labels (CEFR)

Based on N = the result out of the top 5,000 lemmas (Milton & Alexiou 2009, X_Lex bands):

| Level | N | Extra rule |
|---|---|---|
| A1 | under 1,500 | |
| A2 | 1,500 – 2,499 | |
| B1 | 2,500 – 3,249 | |
| B2 | 3,250 – 3,749 | |
| C1 | 3,750 – 4,499, **or** 4,500+ with R50 under 20,000 | |
| C2 | 4,500+ | **and** R50 ≥ 20,000 |

- Show it as **"About level B1"**, never as exact. With honest answers it is within one level of the truth 97–100 % of the time, but people just above a cut-off often get the level below.
- One table for all languages for now. Advanced learners of some languages may be labelled a bit low (French C2 learners score only ~3,500–3,700 on X_Lex).

**What the result page shows:** the big number ("≈ 4,700", or "5,000+"), the line "of the 5,000 most common {language} words", the level chip, a short note if a made-up word was ticked, and "An estimate from your word test." The number counts up from 0 in ~1.5 s, then the chip fades in.

### 1.7 Why these numbers

- **Lemmas, top 5,000, X_Lex penalty**: the only route to a CEFR table built from real scores; lemma is the unit Milton recommends for CEFR. All published size tests count lemmas or word families (Brysbaert et al. 2016).
- **a = 1.75** (not 2): real learners know words unevenly (some rare cognates, some common gaps). That flattens the average curve. With a = 2, beginners read 15–30 % low. a = 1.5 fixes them but reads very "clean" beginners up to 67 % high. 1.75 is the tested middle.
- **g from made-up words only, Beta(1, 15)**: about 6 % assumed guessing before any data, and the result can only go down with a made-up tick.
- **Prior ln 1,200, sd 1.5**: wide on purpose. It only matters when the answers say little (very few ticks).
- **C2 needs R50 ≥ 20,000**: page D words are mostly Latin-based academic words that educated learners know even though subtitles rarely use them. With 15,000, a B2–C1 learner got "C2". With 20,000, learners whose true R50 is 10,000–12,000 get C2 only 1.6–6.5 % of the time, and native speakers are still C2 in all 13 languages.
- **Redo only when clearly guessing** (3+ fakes and 30 %+): research drops test takers above 10–12.5 % false alarms, but with only 9–12 fakes in the test we penalise instead and offer a redo only in clear cases.

### 1.8 Expected results (English; check these after porting)

| Who / what they tick | Result |
|---|---|
| 5 easiest page-A words | ≈ 200 |
| 7–8 random page-A words | ≈ 250 |
| 8 random A + 2 random B | ≈ 300 |
| All of page A only | ≈ 1,100, A1 |
| All of A and B, nothing on C | ≈ 3,500, B2 |
| All of A + 19 of B + the 14 easiest of C (a real B2–C1 learner) | **≈ 4,700, C1** (80 % range 4,461–4,807) |
| Same + 1 / 2 made-up words | ≈ 4,200 / ≈ 3,800 |
| All of A, B, C + 12 of D | 5,000+, C2 |
| All of A + B + 16 C + the 9 rarest D | ≈ 4,800, **C1** (not C2) |
| Native speaker (every real word) | 5,000+, C2 in all 13 languages |
| Every made-up word, or everything | redo screen |

Other languages give lower numbers for the same pattern of taps, because their pages cover different ranks (all of page A: tr / ko 600, ja 1,100). That is correct only if each language's k is correct.

### 1.9 How accurate it is

Simulated learners on the real pages, 13 languages, median of shown ÷ truth (1.00 = perfect):

| True words known (top 5,000) | Realistic learners | Very "clean" learners | Flatter knowledge | Steeper knowledge |
|---|---|---|---|---|
| 250 (A1) | 0.89 | 1.10 | 0.84 | 1.36 |
| 600 (A1) | 0.86 | 1.07 | 0.79 | 1.30 |
| 1,000 (A1) | 0.85 | 1.04 | 0.82 | 1.19 |
| 1,500 (A2) | 0.88 | 1.01 | 0.85 | 1.11 |
| 2,500 (B1) | 0.94 | 0.99 | 0.92 | 1.04 |
| 3,500 (B2) | 0.99 | 0.98 | 0.99 | 0.98 |
| 4,500 (C1) | 1.01 | 0.98 | 1.02 | 0.94 |

Typical error: about 28 % at 100 words, 18 % at 1,000, 13 % at 3,000, 7 % at 10,000. **Treat beginner numbers as ±30 %**; from B1 up it is within about ±10 %.

### 1.10 Known limits (keep these in mind)

1. **Rank data matters most.** If true ranks are 1.5× the k values, results read 41–48 % low at A1–A2. Before ads in a language, cross-check k against an independent list (Lexique for French, JLPT for Japanese, HSK for Chinese, NIKL for Korean).
2. **Korean reads about one level low** until it is rebuilt from the NIKL learner list. No Korean ads before that.
3. **Over-claiming on real words is invisible**: people who tick half-known real words (but not the fakes) read 9–31 % high at beginner levels. The "Some are made up" instruction reduces it. A person-fit check could flag them but also flags many honest learners, so it is only used in reports.
4. **Hand-picked C / D words** are a bit easy for educated learners (academic words), so advanced results may read 4–15 % high. The C2 gate keeps this off the label.
5. ru, ar, fa, tr, ko show only 550–650 for "all of page A" because their page A covers only the top ~550 lemmas. This is correct in lemmas.
6. Cognates lift results for related first languages (Spanish speakers learning Italian, etc.).
7. Subtitles under-rank some everyday objects (spinach, eggplant).

**Language readiness before ads:** en, de, es, pt, ru ready · fr needs the Lexique cross-check · ja, zh need the caps checked against the real JLPT / HSK files · it, ar, fa, tr need a small test budget first, then `analyze-ticks` · ko needs the NIKL rebuild.

### 1.11 Tests to port (must pass)

1. **Data**: every real word has an integer k ≥ 1; learner caps applied.
2. **Profiles**: the table in 1.8 (with a ±1 rounding step). In particular: the B2–C1 case must be C1, never C2; all of A + B + 16 C + 9 rarest D must not be C2 in any language; a native must be C2.
3. **Invariants** (300 random answer sets per language): one more real tick never lowers the result; one more made-up tick never raises it; same answers → same result; 0 real ticks → 0.
4. **Recovery**: simulated learners under 4 truth models (realistic, clean, flatter, steeper) must land within 0.80–1.20 (0.88–1.12 from B1 up) for realistic and clean learners, and 0.70–1.45 (0.85–1.15 from B1 up) for flatter and steeper ones.
5. **Typed-language pack**: which words were ticked and their order never change the result; all A (page C skipped by the rule) = 850; A + B = 2,600 B1.

Checked 2026-11-17: the code block in 1.5 run on its own with `vocab/en.json` gives exactly the 1.8 table (200 · 1,100 · 3,500 B2 · 4,700 C1 · 4,200 · 4,800 C1 · 5,000+ C2 · redo), and `deckBand` gives the 2.1 table.

Run in the funnel: `node tools/test-estimate.mjs` (about 40 s; exit code 1 if a target fails).

### 1.12 After launch: tune from real answers

- Save with every result: est_v (4), the slope used (1.75), which word file version, language code, words, raw, lo, hi, r50, g, real ticks, fakes, fn, pages shown, reliable, redo, and **`ticks`** = for each shown page, 1 / 0 for every item in file order (e.g. `A:1101…,B:…`).
- After ~300 learners per language, run `node tools/analyze-ticks.mjs <events>`. It reports per language:
  1. the slope that fits real answers (change `EST_A` if it is outside 1.5–2.0, then re-run the tests);
  2. single words whose answers fit a rank more than 3× off their k (fix k or replace the word);
  3. made-up words ticked by more than 20 % of advanced learners (replace them), and markets whose median fake-tick rate is over 15 %;
  4. the share of odd answer patterns per market;
  5. the median result per self-rated level (a whole language off by one factor shows up here).

**Phase 2 (planned, not built):** pages by real lemma bands (A 30–1,000, B 1,000–2,500, C 2,500–5,000, D 5,000–10,000), **random stratified sampling** instead of hand-picking, **5 made-up words per page** from a trigram model, C if real B ≥ 7, D if real C ≥ 8, C2 gate back to R50 ≥ 15,000.

---

## Part 2 — Giving the right words (level-matched decks)

### 2.1 From the result to a deck band

```js
// Same function on the page and on the server. level = self-rating, est = word-test result (0–5,000) or null.
export function deckBand(level, est) {
  if (level === "a0") return 0;                                   // starting from zero (no test)
  if (est != null) return est < 500 ? 1 : est < 1500 ? 2 : est < 3250 ? 3 : 4;   // the test wins
  return { a1: 1, a2: 2, b1: 3, b2: 4 }[level] ?? 2;             // no test: self-rating
}
```

| Band | When | Name used in the prompt |
|---|---|---|
| 0 | self-rated "Starting from zero" | Complete beginner |
| 1 | result under 500 (or self-rated a1) | Beginner (A1) |
| 2 | 500 – 1,499 (or a2) | Elementary (A2) |
| 3 | 1,500 – 3,249 (or b1) | Intermediate (B1) |
| 4 | 3,250 and up (or b2) | Upper-intermediate to advanced (B2–C1) |

The test result always wins over the self-rating. (People rate themselves wrong both ways.)

### 2.2 What each band gets

**The rule (the owner's, very important):** every deck fits the learner's **level, goal and interests**. About **25 % easy** (a quick win, they may know them), **50 % right at their level and new to them**, **25 % stretch** (a bit above). So about half the deck is new. Never far too easy, never far too hard. Higher levels get mostly **collocations, useful phrases and idiomatic expressions**; beginners get basic, concrete words.

Text sent to the AI for each band (`lib/level.mjs`, verbatim):

| Band | What goes in the deck |
|---|---|
| 0 | Complete beginner, starting from zero. Only the very first, most useful words for this topic: short, concrete, very common single words (among the 500 most frequent) and at most 2 tiny fixed phrases (like "thank you" or "how much?"). Nothing abstract, no collocations. **+ "Everything is new to them: keep every item easy to learn. Order the items from easiest to hardest."** |
| 1 | Beginner (A1). Common, concrete single words among the 1,500 most frequent, plus at most 1 short fixed phrase. Easy items: rank about 1–300. At-level items: about 300–1,000. Stretch items: about 1,000–1,500. |
| 2 | Elementary (A2). Mostly single words among the 3,500 most frequent, plus 2 short, useful phrases. Leave out the most basic words of the topic (for travel: train, ticket, car, bus). Easy items: rank about 500–1,000. At-level items: about 1,000–2,500. Stretch items: about 2,500–3,500. |
| 3 | Intermediate (B1). No basic words: nothing among the 1,500 most frequent single words (for travel, never words like train, ticket, map, far, airport or suitcase). About 4 less common single words, 3 collocations (natural word pairs, e.g. Spanish "pedir la cuenta", English "make a reservation") and 3 useful everyday phrases. Easy items: rank about 1,500–2,500. At-level items: about 2,500–5,000. Stretch items: about 5,000–8,000. |
| 4 | Upper-intermediate to advanced (B2–C1). No basic or intermediate single words: nothing among the 3,000 most frequent (for travel, never words like train, ticket, map, far, airport, suitcase, passport, book or delayed). Mostly natural collocations, phrasal verbs and idiomatic phrases that make them sound like a native speaker, plus precise, less common words: about 3 advanced single words, 4 collocations and 3 idiomatic or very useful phrases. Easy items: upper-intermediate collocations they may half know. At-level items: C1 collocations and expressions. Stretch items: rarer C1–C2 items a native speaker uses. |

Bands 1–4 add: **"Mix the difficulty: about 3 easy items (they may know them already: a quick win), about 5 items right at their level that are most likely new to them, and about 2 stretch items a bit above their level. So about half the deck is new to them and nothing is far too easy or far too hard. Order the items from easiest to hardest."**
Bands 3–4 also add the measured size: *"A short word test says they know about 4,700 of the 5,000 most common words."* (or "nearly all" at 5,000).

**Real example** (same request "buying tickets and riding the train in London", English, live on 2026-11-02):
- **C1** (result 4,700): top up, return ticket, the platform, change trains, rush hour, tap in, off-peak, mind the gap, queue up, dead set on.
- **A1** (result 400): train, ticket, buy, platform, single, return, station, change, conductor, board.
- **Starting from zero** (Spanish, "buying a train ticket in Madrid"): el billete, la estación, el tren, hoy, mañana, ida, el andén, por favor, ¿Cuánto cuesta?, la tarjeta.

### 2.3 The AI call (deck of 10)

- **Model: Claude Sonnet 5.5, effort "low"**, structured output (JSON schema). About 14–20 s for 10 cards.
  - Not Opus: with the funnel site's key, Opus at effort "low" returned an **empty deck** in ~5 s, and at higher effort it ran past Netlify's ~30 s limit. Sonnet gives level-fitting decks in time. In an app without a 30 s limit, Opus at higher effort is fine if you test it.
- **Inputs:** language learned, native language, self-rated level, the test result, main goal (+ their own words if "other"), interests, and the deck request in their own words (an idea card they tapped, or text they typed).

**System prompt:**
> You make small personal vocabulary decks for a language-learning app. You are careful: every word is real, common in that language and correctly spelled, and every translation is correct. You write short, simple, natural sentences.

**User prompt** (fill the `${…}` parts):
```
Learner:
Learning: ${language}
Native language: ${native}
Level (self-rated): ${level}; a short word test says they recognise about ${est} of the 5,000 most common words
Main goal: ${goal} (in their words: "${reason}")
Interests: ${interests}

Deck they asked for (their words): "${request}"

Make a deck of exactly 10 different words or short phrases in ${language} that fit the request, the learner's level, their goal and their interests.
What to put in this deck for this learner's level: ${deckMix(level, est)}
For each item:
- word: in ${language}, standard spelling, usual script. Nouns with the article learners normally see where the language has one (e.g. Spanish "la propina", German "das Trinkgeld", French "le pourboire"); verbs in dictionary form.
- reading: only for non-Latin scripts (Japanese: hiragana; Chinese: pinyin with tone marks; Korean: Revised Romanization; other scripts: a simple Latin transliteration). Otherwise "".
- translation: the word in ${native}, 1 to 4 words.
- meaning: a simple definition in ${language} with easy, common words, at most 10 words, without using the word itself.
- example: one short sentence in ${language} (at most 12 words) at the learner's level, personal to their goal and interests, about the learner ("I", "my"). Wrap the form of the word used in the sentence in single asterisks, like *propina*.
- example_translation: that sentence in ${native}, without asterisks.
- scene: one short, concrete description in English (at most 20 words) of a simple scene an illustrator can draw that shows the meaning …
title: a short deck name in ${page language}, 2 to 4 words, like "Ordering food".
useit: exactly 3 entries, for the 3 EASIEST of the 10 words … (practice sentences; see lw-ai.mjs)
Before you answer, check every item: Is the word real and correctly spelled? Does the example use exactly this word or phrase (not a synonym)? Is the translation right? Does it fit this learner's level and the easy / at-level / stretch mix above (replace any item a learner at this level surely knows already)? Does it fit their goal and interests? Is the example natural and does it contain the word? Fix anything wrong.
```

**Checks after the answer:** drop items with no word, translation or example; drop duplicates (case-insensitive); fewer than 10 left → treat as failed.

**What the card shows:** low levels (a0–a2) see the translation in their own language; high levels (b1–b2) see the simple meaning in the target language. Every word has a pronunciation button.

### 2.4 Timing (so the deck is ready and fits the level)

- Start the deck calls **as soon as the level is final**: on the result page (after the test), or when an a0 learner finishes choosing interests. Do not start them before the test: the level usually changes and the call is wasted.
- The deck ideas (3 topic titles from goal + interests) can be fetched earlier; they do not depend much on level.
- Cache decks by (answers + deck band + request). Same band → reuse.
- When the learner picks a deck: wait for it (up to 32 s), retry once if it failed fast (under 12 s). Only if both fail, show a basic ready-made deck, and say honestly that the AI was busy. (A basic fallback deck shown to a C1 learner is exactly what made "train, ticket, far" appear.)

### 2.5 Decks of other sizes (10 to 30 words)

A deck Kai offers in the New words chat has its own size, from 10 to 30 words (Kai picks it; the first deck in onboarding is always 10). The rules above stay the same. Only the counts grow with the size (`bandText`, `mixText` in `apps/server/src/decks/band.ts`):

- **The prompt** says "exactly N different words".
- **The mix** keeps 25 % easy, 50 % at level, 25 % stretch: at-level = N ÷ 2 (rounded), stretch = half of the rest (rounded down), easy = what is left. So 10 → 3 / 5 / 2 (the text above), 20 → 5 / 10 / 5, 30 → 8 / 15 / 7.
- **The counts in the band texts** grow by N ÷ 10 (rounded, at least 1): band 0 "at most 2 tiny fixed phrases" → 4 at 20; band 3 "4 single words, 3 collocations, 3 phrases" → 8, 6, 6 at 20; band 4 "3 single words, 4 collocations, 3 phrases" → 9, 12, 9 at 30. At 10 every text is the one above, word for word.
- **Checks after the answer:** fewer than N good items left → treat as failed. More → the first N.
- **Timing:** a deck of 30 takes about three times as long as a deck of 10, so the call's limit is 90 s.

---

## Part 3 — Porting checklist

1. Copy the reference code in 1.5 and the `deckBand` / band texts in 2.1–2.2.
2. Copy the word files `vocab/<code>.json` for your languages (keep the CC BY-SA credit). For a new language, build k as in 1.3 and run the tests.
3. Build the flow in 1.4: level question (a0 skips) → A → B → C if real B ≥ 4 → D if real C ≥ 15 → result page.
4. Keep the instruction "Only tap words you know the meaning of. Some are made up." and the "See all words" button guard on small screens.
5. Show the result as in 1.6 ("≈ N", "5,000+", "About level X") and the redo rule in 1.5 step 10.
6. Save every answer as `ticks` (1.12) from day one, so you can tune later.
7. Send the result to your deck generator as `estimate`; use the band texts and the prompt in 2.3; start decks when the level is final (2.4).
8. Port the tests in 1.11 and check the expected results in 1.8 before shipping.

## Sources

- Meara & Milton 2003 (X_Lex). Milton & Alexiou 2009, CEFR table: https://www.enl.auth.gr/gala/14th/Papers/English%20papers/Milton&Alexiou.pdf
- Milton 2010: https://www.eurosla.org/monographs/EM01/211-232Milton.pdf
- Brysbaert et al. 2016: https://pmc.ncbi.nlm.nih.gov/articles/PMC4965448
- Stubbe 2015 (recognition vs translation; h − f works best): https://www.castledown.com/journals/vli/article/view/vli.v04.2.stubbe/396
- Huibregtse, Admiraal & Meara 2002 (corrections for guessing). Meara & Buxton 1987: https://www.lextutor.ca/rand/meara_buxton.pdf
- Lemhöfer & Broersma 2012, LexTALE: https://pmc.ncbi.nlm.nih.gov/articles/PMC3356522/ · Schmitt, Jiang & Grabe 2011 (false-alarm cut-offs)
- Data: FrequencyWords by Hermit Dave (CC BY-SA 4.0, OpenSubtitles) · simplemma (MIT; Wiktionary-derived lemma data)
