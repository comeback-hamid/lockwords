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

// The text for "What to put in this deck for this learner's level".
export function deckMix(band: number, est: number | null): string {
  const parts: string[] = [BAND_TEXT[band] ?? BAND_TEXT[2]];
  if (band >= 1) parts.push(MIX_TEXT);
  if (band >= 3 && est != null) parts.push(measuredSize(est));
  return parts.join(' ');
}
