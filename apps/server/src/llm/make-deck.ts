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
};

export const ProposalSchema = z.object({ title: z.string().min(1).max(120), reason: z.string().min(1).max(60) });
export const CardSchema = z.object({
  word: z.string().min(1).max(60),
  translation: z.string().min(1).max(120),
  example: z.string().min(1).max(240),
  exampleTranslation: z.string().min(1).max(240),
});
export const DECK_SIZE = 10;
export const CardsSchema = z.object({ cards: z.array(CardSchema).length(DECK_SIZE) });

export type NewCard = z.infer<typeof CardSchema>;
// What a model may send back before the checks: any field can be missing or empty.
export type RawCard = Partial<Record<keyof NewCard, string | null>>;
export type DeckMaker = {
  propose(input: DeckInput): Promise<z.infer<typeof ProposalSchema>>;
  cards(input: DeckInput): Promise<RawCard[]>;
};

// vocab-engine 2.3 "Checks after the answer": drop items with no word, translation or example; drop duplicates
// (ignoring case); remove the *asterisks* around the word. Fewer than 10 left = a failed try. More = the first 10.
export function checkCards(raw: RawCard[]): NewCard[] {
  const seen = new Set<string>();
  const out: NewCard[] = [];
  for (const r of raw) {
    const word = r.word?.trim(), translation = r.translation?.trim(), example = r.example?.replace(/\*/g, '').trim();
    if (!word || !translation || !example) continue;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ word, translation, example, exampleTranslation: (r.exampleTranslation ?? '').replace(/\*/g, '').trim() || translation });
  }
  if (out.length < DECK_SIZE) throw new Error(`only ${out.length} good cards`);
  return CardsSchema.parse({ cards: out.slice(0, DECK_SIZE) }).cards;
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

// The user prompt from vocab-engine 2.3, with only the fields our cards store today.
export function deckPrompt(i: DeckInput): string {
  const language = languageName(i.learningLanguage), native = languageName(i.nativeLanguage);
  const band = bandForProfile(i.level, i.knownWords);
  const test = i.knownWords != null ? `; a short word test says they recognise about ${i.knownWords.toLocaleString('en-US')} of the 5,000 most common words` : '';
  const goal = i.goal === 'other' && i.goalOther ? `${GOAL_NAME[i.goal]} (in their words: "${i.goalOther}")` : GOAL_NAME[i.goal];
  return `Learner:
Learning: ${language}
Native language: ${native}
Level (self-rated): ${LEVEL_NAME[i.level]}${test}
Main goal: ${goal}
Interests: ${i.interests.length ? i.interests.join(', ') : 'none given'}

Deck they asked for (their words): "${i.topic}"

Make a deck of exactly ${DECK_SIZE} different words or short phrases in ${language} that fit the request, the learner's level, their goal and their interests.
What to put in this deck for this learner's level: ${deckMix(band, i.knownWords)}
For each item:
- word: in ${language}, standard spelling, usual script. Nouns with the article learners normally see where the language has one (e.g. Spanish "la propina", German "das Trinkgeld", French "le pourboire"); verbs in dictionary form.
- translation: the word in ${native}, 1 to 4 words.
- example: one short sentence in ${language} (at most 12 words) at the learner's level, personal to their goal and interests, about the learner ("I", "my"). Wrap the form of the word used in the sentence in single asterisks, like *propina*.
- example_translation: that sentence in ${native}, without asterisks.
Before you answer, check every item: Is the word real and correctly spelled? Does the example use exactly this word or phrase (not a synonym)? Is the translation right? Does it fit this learner's level and the easy / at-level / stretch mix above (replace any item a learner at this level surely knows already)? Does it fit their goal and interests? Is the example natural and does it contain the word? Fix anything wrong.`;
}
