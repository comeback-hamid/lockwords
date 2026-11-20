import { expect, test } from 'vitest';

import { buildKaiPrompt, type KaiContext } from '../../src/llm/kai-chat.js';

// Change new-words-polish: Kai writes every line fully in the learning language (found on the real AI, 2026-11-19:
// "Tengo 3 decks listos para ti", "¡Tu deck está listo!").
const ctx = (over: Partial<KaiContext> = {}): KaiContext => ({
  name: 'Maya',
  learningLanguage: 'Spanish',
  nativeLanguage: 'English',
  cefr: 'A1',
  knownWords: 200,
  goal: 'travel',
  goalOther: null,
  interests: ['food'],
  notes: [],
  history: [],
  words: { total: 10, reviewedLastDay: 0, dueNow: 10, sample: [] },
  opening: false,
  firstVisit: false,
  userText: 'Hola Kai',
  ...over,
});

test('the prompt says: no English app words in a line, the language’s own word for a deck, and which names stay', () => {
  for (const L of ['Spanish', 'Persian']) {
    const p = buildKaiPrompt(ctx({ learningLanguage: L })).system;
    for (const rule of [`Write every line fully in ${L}`, 'Never drop English app words', `${L}'s own everyday word`, '"mazo"', 'the names of things the learner taps', '"Generate", "Review" and "Random Words"']) expect(p).toContain(rule);
    // The example line about decks does not teach the English word.
    expect(p).not.toContain('Look, 3 decks for you');
  }
});
