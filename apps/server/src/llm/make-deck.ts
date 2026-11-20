import { z } from 'zod';

import { bandForProfile, deckMix } from '../decks/band.js';
import type { Profile } from '../onboarding/profile.js';

// AI task: make a first deck. One interface; the fixture and the real model both implement it.
// The words fit the learner's band, goal and interests (docs/vocab-engine.md Part 2).
export type DeckInput = {
  topic: string;
  learningLanguage: string;
  nativeLanguage: string;
  cefr: string;
  level: Profile['level'];
  knownWords: number | null;
  goal: Profile['goal'];
  goalOther: string | null;
  interests: string[];
  wordCount?: number; // how many cards to make: the deck's own size (10 to 30). None = 10, the first deck.
};

const MEANING_MAX = 140;
export const ProposalSchema = z.object({ title: z.string().min(1).max(120), reason: z.string().min(1).max(60) });
export const CardSchema = z.object({
  word: z.string().min(1).max(60),
  translation: z.string().min(1).max(120),
  example: z.string().min(1).max(240),
  exampleTranslation: z.string().min(1).max(240),
  // A short definition in the language being learned. Only for the top band (B2–C1); the card back shows it in place of the translation.
  meaning: z.string().min(1).max(MEANING_MAX).optional(),
});
export const DECK_SIZE = 10; // the first deck (onboarding). A deck from the New words chat has its own size.
export const CardsSchema = z.object({ cards: z.array(CardSchema).length(DECK_SIZE) });

export type NewCard = z.infer<typeof CardSchema>;
// What a model may send back before the checks: any field can be missing or empty.
export type RawCard = Partial<Record<keyof NewCard, string | null>>;
export type DeckMaker = {
  propose(input: DeckInput): Promise<z.infer<typeof ProposalSchema>>;
  cards(input: DeckInput): Promise<RawCard[]>;
};

// vocab-engine 2.3 "Checks after the answer": drop items with no word, translation or example; drop duplicates
// (ignoring case); remove the *asterisks* around the word. Fewer than the deck's size left = a failed try. More = the first ones.
// A meaning is kept only when it is there, short enough, and does not just repeat the word. Otherwise the card shows its translation.
function goodMeaning(raw: string | null | undefined, word: string): string | null {
  const meaning = raw?.replace(/\*/g, '').trim();
  if (!meaning || meaning.length > MEANING_MAX) return null;
  const bare = word.toLocaleLowerCase().split(/\s+/).at(-1) ?? ''; // "la propina" → "propina"
  return bare.length >= 3 && meaning.toLocaleLowerCase().includes(bare) ? null : meaning;
}

export function checkCards(raw: RawCard[], size = DECK_SIZE): NewCard[] {
  const seen = new Set<string>();
  const out: NewCard[] = [];
  for (const r of raw) {
    const word = r.word?.trim(), translation = r.translation?.trim(), example = r.example?.replace(/\*/g, '').trim();
    if (!word || !translation || !example) continue;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const meaning = goodMeaning(r.meaning, word);
    out.push({ word, translation, example, exampleTranslation: (r.exampleTranslation ?? '').replace(/\*/g, '').trim() || translation, ...(meaning ? { meaning } : {}) });
  }
  if (out.length < size) throw new Error(`only ${out.length} good cards`);
  return z.array(CardSchema).length(size).parse(out.slice(0, size));
}

export const DECK_SYSTEM_PROMPT =
  'You make small personal vocabulary decks for a language-learning app. You are careful: every word is real, common in that language and correctly spelled, and every translation is correct. You write short, simple, natural sentences.';

const LEVEL_NAME: Record<Profile['level'], string> = { brand_new: 'Starting from zero', beginner: 'Beginner', some_basics: 'Some basics', intermediate: 'Intermediate', advanced: 'Advanced' };
const GOAL_NAME: Record<Profile['goal'], string> = { travel: 'travel', work: 'work', move_abroad: 'moving abroad', family_friends: 'family and friends', brain: 'keeping the brain sharp', school: 'school', other: 'other' };

// A profile may hold a code ("es") or a name ("Spanish"): the prompt wants a name in English.
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

// Higher levels get the meaning in the language they learn (docs/product.md 2, Figma O12c): the top deck band, B2–C1.
const MEANING_BAND = 4;
export const wantsMeaning = (i: Pick<DeckInput, 'level' | 'knownWords'>) => bandForProfile(i.level, i.knownWords) >= MEANING_BAND;

// The user prompt from vocab-engine 2.3, with only the fields our cards store today.
export function deckPrompt(i: DeckInput): string {
  const language = languageName(i.learningLanguage), native = languageName(i.nativeLanguage);
  const band = bandForProfile(i.level, i.knownWords);
  const size = i.wordCount ?? DECK_SIZE;
  const test = i.knownWords != null ? `; a short word test says they recognise about ${i.knownWords.toLocaleString('en-US')} of the 5,000 most common words` : '';
  const goal = i.goal === 'other' && i.goalOther ? `${GOAL_NAME[i.goal]} (in their words: "${i.goalOther}")` : GOAL_NAME[i.goal];
  return `Learner:
Learning: ${language}
Native language: ${native}
Level (self-rated): ${LEVEL_NAME[i.level]}${test}
Main goal: ${goal}
Interests: ${i.interests.length ? i.interests.join(', ') : 'none given'}

Deck they asked for (their words): "${i.topic}"

Make a deck of exactly ${size} different words or short phrases in ${language} that fit the request, the learner's level, their goal and their interests.
What to put in this deck for this learner's level: ${deckMix(band, i.knownWords, size)}
For each item:
- word: in ${language}, standard spelling, usual script. Nouns with the article learners normally see where the language has one (e.g. Spanish "la propina", German "das Trinkgeld", French "le pourboire"); verbs in dictionary form.
- translation: the word in ${native}, 1 to 4 words.
- example: one short sentence in ${language} (at most 12 words) at the learner's level, personal to their goal and interests, about the learner ("I", "my"). Wrap the form of the word used in the sentence in single asterisks, like *propina*.
- example_translation: that sentence in ${native}, without asterisks.${wantsMeaning(i) ? `\n- meaning: a short definition of the word in ${language} (not a translation), in simple words, at most 14 words, without using the word itself.` : ''}
Before you answer, check every item: Is the word real and correctly spelled? Does the example use exactly this word or phrase (not a synonym)? Is the translation right? Does it fit this learner's level and the easy / at-level / stretch mix above (replace any item a learner at this level surely knows already)? Does it fit their goal and interests? Is the example natural and does it contain the word? Fix anything wrong.`;
}
