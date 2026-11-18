import { expect, test } from 'vitest';

import { DECK_SYSTEM_PROMPT, deckPrompt, type DeckInput } from '../../src/llm/make-deck.js';

const base: DeckInput = { topic: 'Ordering food', learningLanguage: 'es', nativeLanguage: 'en', cefr: 'B2', level: 'intermediate', knownWords: 4700, goal: 'travel', goalOther: null, interests: ['food', 'music'] };

test('system prompt is the one from vocab-engine 2.3', () => {
  expect(DECK_SYSTEM_PROMPT).toBe('You make small personal vocabulary decks for a language-learning app. You are careful: every word is real, common in that language and correctly spelled, and every translation is correct. You write short, simple, natural sentences.');
});

test('advanced learner: band 4 text, mix, measured size, goal, interests, topic', () => {
  const p = deckPrompt(base);
  expect(p).toContain('Upper-intermediate to advanced (B2–C1).');
  expect(p).toContain('Mix the difficulty: about 3 easy items');
  expect(p).toContain('about 4,700 of the 5,000 most common words');
  expect(p).toContain('Main goal: travel');
  expect(p).toContain('Interests: food, music');
  expect(p).toContain('"Ordering food"');
  expect(p).toContain('Learning: Spanish');
  expect(p).toContain('Native language: English');
});

test('nearly all at 5,000', () => {
  expect(deckPrompt({ ...base, knownWords: 5000 })).toContain('nearly all of the 5,000 most common words');
});

test('starting from zero: band 0 text, no mix, no measured size', () => {
  const p = deckPrompt({ ...base, level: 'brand_new', knownWords: null });
  expect(p).toContain('Complete beginner, starting from zero.');
  expect(p).toContain('Everything is new to them: keep every item easy to learn. Order the items from easiest to hardest.');
  expect(p).not.toContain('Mix the difficulty');
  expect(p).not.toContain('most common words.');
});

test('learner block: goal other in their own words', () => {
  const p = deckPrompt({ ...base, goal: 'other', goalOther: 'for my wife', knownWords: 300, level: 'beginner' });
  expect(p).toContain('"for my wife"');
  expect(p).toContain('food, music');
  expect(p).toContain('Ordering food');
  expect(p).toContain('Beginner (A1).');
  expect(p).not.toContain('most common words.'); // band 1: no measured size
});
