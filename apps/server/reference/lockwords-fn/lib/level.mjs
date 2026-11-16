// Deck level for funnel v3 (shared by lw-ai.mjs; tested in test/level.test.mjs).
// Keep deckBand() in step with deckBand() in funnel/v3/index.html.
//   0 = A0: self-rated "starting from zero" (they skip the word test, so there is no estimate)
//   1–4 = from the word-test estimate when we have it, else from the self-rating (A1, A2, B1, B2+)
// est = funnel v3 word test v4: dictionary words (lemmas) known among the 5,000 most common of the language
// (0–5,000; 5,000 = "5,000+"). Cut-offs <500, <1,500, <3,250, else advanced.
export function deckBand(level, est) {
  if (level === "a0") return 0;
  if (est != null) return est < 500 ? 1 : est < 1500 ? 2 : est < 3250 ? 3 : 4;
  return { a1: 1, a2: 2, b1: 3, b2: 4 }[level] ?? 2;
}

// What goes in a 10-card deck at each band. Ranks = frequency ranks of single words in the language.
const BANDS = [
  "Complete beginner, starting from zero. Only the very first, most useful words for this topic: short, concrete, very common single words (among the 500 most frequent) and at most 2 tiny fixed phrases (like \"thank you\" or \"how much?\"). Nothing abstract, no collocations.",
  "Beginner (A1). Common, concrete single words among the 1,500 most frequent, plus at most 1 short fixed phrase. Easy items: rank about 1–300. At-level items: about 300–1,000. Stretch items: about 1,000–1,500.",
  "Elementary (A2). Mostly single words among the 3,500 most frequent, plus 2 short, useful phrases. Leave out the most basic words of the topic (for travel: train, ticket, car, bus). Easy items: rank about 500–1,000. At-level items: about 1,000–2,500. Stretch items: about 2,500–3,500.",
  "Intermediate (B1). No basic words: nothing among the 1,500 most frequent single words (for travel, never words like train, ticket, map, far, airport or suitcase). About 4 less common single words, 3 collocations (natural word pairs, e.g. Spanish \"pedir la cuenta\", English \"make a reservation\") and 3 useful everyday phrases. Easy items: rank about 1,500–2,500. At-level items: about 2,500–5,000. Stretch items: about 5,000–8,000.",
  "Upper-intermediate to advanced (B2–C1). No basic or intermediate single words: nothing among the 3,000 most frequent (for travel, never words like train, ticket, map, far, airport, suitcase, passport, book or delayed). Mostly natural collocations, phrasal verbs and idiomatic phrases that make them sound like a native speaker, plus precise, less common words: about 3 advanced single words, 4 collocations and 3 idiomatic or very useful phrases. Easy items: upper-intermediate collocations they may half know. At-level items: C1 collocations and expressions. Stretch items: rarer C1–C2 items a native speaker uses."
];
// The learner's ask (2026-11-02): about half the deck new to them, 25 % easy, 25 % hard, always for their level.
const MIX = "Mix the difficulty: about 3 easy items (they may know them already: a quick win), about 5 items right at their level that are most likely new to them, and about 2 stretch items a bit above their level. So about half the deck is new to them and nothing is far too easy or far too hard. Order the items from easiest to hardest.";
const MIX0 = "Everything is new to them: keep every item easy to learn. Order the items from easiest to hardest.";

export function deckMix(level, est) {
  const b = deckBand(level, est);
  const known = b >= 3 && est != null ? ` A short word test says they know ${est >= 5000 ? "nearly all" : `about ${est.toLocaleString("en")}`} of the 5,000 most common words.` : "";
  return `${BANDS[b]}${known} ${b ? MIX : MIX0}`;
}
