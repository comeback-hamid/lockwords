// Deck bands: docs/vocab-engine.md 2.1–2.2, copied word for word. Pure functions.
import type { Profile } from '../onboarding/profile.js';

// The doc's function. level = self-rating (a0…b2), est = word-test result (0–5,000) or null.
export function deckBand(level: string, est: number | null): number {
  if (level === 'a0') return 0; // starting from zero (no test)
  if (est != null) return est < 500 ? 1 : est < 1500 ? 2 : est < 3250 ? 3 : 4; // the test wins
  return ({ a1: 1, a2: 2, b1: 3, b2: 4 } as Record<string, number>)[level] ?? 2; // no test: self-rating
}

// Our profile levels → the doc's self-rating codes.
export const LEVEL_CODE: Record<Profile['level'], string> = { brand_new: 'a0', beginner: 'a1', some_basics: 'a2', intermediate: 'b1', advanced: 'b2' };

export const bandForProfile = (level: Profile['level'], knownWords: number | null) => deckBand(LEVEL_CODE[level], knownWords);

// What goes in the deck for each band (2.2, the text sent to the AI).
export const BAND_TEXT = [
  'Complete beginner, starting from zero. Only the very first, most useful words for this topic: short, concrete, very common single words (among the 500 most frequent) and at most 2 tiny fixed phrases (like "thank you" or "how much?"). Nothing abstract, no collocations. Everything is new to them: keep every item easy to learn. Order the items from easiest to hardest.',
  'Beginner (A1). Common, concrete single words among the 1,500 most frequent, plus at most 1 short fixed phrase. Easy items: rank about 1–300. At-level items: about 300–1,000. Stretch items: about 1,000–1,500.',
  'Elementary (A2). Mostly single words among the 3,500 most frequent, plus 2 short, useful phrases. Leave out the most basic words of the topic (for travel: train, ticket, car, bus). Easy items: rank about 500–1,000. At-level items: about 1,000–2,500. Stretch items: about 2,500–3,500.',
  'Intermediate (B1). No basic words: nothing among the 1,500 most frequent single words (for travel, never words like train, ticket, map, far, airport or suitcase). About 4 less common single words, 3 collocations (natural word pairs, e.g. Spanish "pedir la cuenta", English "make a reservation") and 3 useful everyday phrases. Easy items: rank about 1,500–2,500. At-level items: about 2,500–5,000. Stretch items: about 5,000–8,000.',
  'Upper-intermediate to advanced (B2–C1). No basic or intermediate single words: nothing among the 3,000 most frequent (for travel, never words like train, ticket, map, far, airport, suitcase, passport, book or delayed). Mostly natural collocations, phrasal verbs and idiomatic phrases that make them sound like a native speaker, plus precise, less common words: about 3 advanced single words, 4 collocations and 3 idiomatic or very useful phrases. Easy items: upper-intermediate collocations they may half know. At-level items: C1 collocations and expressions. Stretch items: rarer C1–C2 items a native speaker uses.',
] as const;

export const MIX_TEXT =
  'Mix the difficulty: about 3 easy items (they may know them already: a quick win), about 5 items right at their level that are most likely new to them, and about 2 stretch items a bit above their level. So about half the deck is new to them and nothing is far too easy or far too hard. Order the items from easiest to hardest.';

export const measuredSize = (est: number) =>
  `A short word test says they know ${est >= 5000 ? 'nearly all' : `about ${est.toLocaleString('en-US')}`} of the 5,000 most common words.`;

// 2.5: a deck from the New words chat has its own size (10 to 30). The counts in the texts above are for 10 items;
// for another size they grow with it. At 10 every text is the doc's, word for word.
const scaled = (base: number, size: number) => Math.max(1, Math.round((base * size) / DOC_SIZE));
const DOC_SIZE = 10;

export function bandText(band: number, size = DOC_SIZE): string {
  const b = BAND_TEXT[band] ? band : 2;
  const text: string = BAND_TEXT[b]!;
  if (size === DOC_SIZE) return text;
  const n = (base: number) => scaled(base, size);
  if (b === 0) return text.replace('at most 2 tiny fixed phrases', `at most ${n(2)} tiny fixed phrases`);
  if (b === 1) return text.replace('at most 1 short fixed phrase.', `at most ${n(1)} short fixed phrase${n(1) > 1 ? 's' : ''}.`);
  if (b === 2) return text.replace('plus 2 short, useful phrases', `plus ${n(2)} short, useful phrases`);
  if (b === 3)
    return text
      .replace('About 4 less common single words, 3 collocations', `About ${size - 2 * n(3)} less common single words, ${n(3)} collocations`)
      .replace('and 3 useful everyday phrases', `and ${n(3)} useful everyday phrases`);
  return text.replace('about 3 advanced single words, 4 collocations and 3 idiomatic', `about ${n(3)} advanced single words, ${size - 2 * n(3)} collocations and ${n(3)} idiomatic`);
}

// 25 % easy, 50 % at level, 25 % stretch (2.2). The three parts add up to the size; at 10 it is the doc's 3 / 5 / 2.
export function mixText(size = DOC_SIZE): string {
  if (size === DOC_SIZE) return MIX_TEXT;
  const level = Math.round(size / 2);
  const stretch = Math.floor((size - level) / 2);
  return MIX_TEXT.replace('about 3 easy items', `about ${size - level - stretch} easy items`)
    .replace('about 5 items right at their level', `about ${level} items right at their level`)
    .replace('about 2 stretch items', `about ${stretch} stretch items`);
}

// The text for "What to put in this deck for this learner's level". `size` = how many items the deck gets.
export function deckMix(band: number, est: number | null, size = DOC_SIZE): string {
  const parts: string[] = [bandText(band, size)];
  if (band >= 1) parts.push(mixText(size));
  if (band >= 3 && est != null) parts.push(measuredSize(est));
  return parts.join(' ');
}
