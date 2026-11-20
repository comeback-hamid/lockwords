import { expect, test } from 'vitest';

import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { checkCards, deckPrompt, wantsMeaning, type DeckInput } from '../../src/llm/make-deck.js';

const input = (over: Partial<DeckInput> = {}): DeckInput => ({ topic: 'Ordering food', learningLanguage: 'es', nativeLanguage: 'en', cefr: 'A1', level: 'beginner', knownWords: null, goal: 'travel', goalOther: null, interests: ['food'], ...over });
const advanced = input({ level: 'advanced', knownWords: 4600, cefr: 'C1' });
const raw = (i: number, meaning?: string | null) => ({ word: `palabra${i}`, translation: `word ${i}`, example: `Uso *palabra${i}* hoy.`, exampleTranslation: `I use word ${i} today.`, meaning });

test('only the top band (B2–C1) asks for a meaning in the learned language', () => {
  expect(wantsMeaning(advanced)).toBe(true);
  expect(wantsMeaning(input({ level: 'intermediate', knownWords: 2000 }))).toBe(false);
  expect(wantsMeaning(input())).toBe(false);
  expect(deckPrompt(advanced)).toContain('- meaning: a short definition of the word in Spanish');
  expect(deckPrompt(input())).not.toContain('- meaning:');
});

test('a good meaning is kept; a missing, too long or word-repeating one is dropped and the card stays', () => {
  const cards = checkCards([raw(0, ' Algo que se dice. '), raw(1), raw(2, null), raw(3, 'x'.repeat(141)), raw(4, 'Una palabra4 muy común.'), ...[5, 6, 7, 8, 9].map((i) => raw(i, 'Otra cosa.'))]);
  expect(cards).toHaveLength(10);
  expect(cards[0]!.meaning).toBe('Algo que se dice.');
  expect([1, 2, 3, 4].map((i) => cards[i]!.meaning ?? null)).toEqual([null, null, null, null]);
  expect(cards[5]!.meaning).toBe('Otra cosa.');
});

test('a word with an article: the meaning may not repeat the bare word', () => {
  const [card] = checkCards([{ ...raw(0, 'Dinero extra; una propina es un regalo.'), word: 'la propina' }, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => raw(i))]);
  expect(card!.meaning ?? null).toBeNull();
});

test('the stand-in deck has meanings for the top band only', async () => {
  const high = checkCards(await fixtureDeckMaker.cards(advanced));
  expect(high.every((c) => typeof c.meaning === 'string' && c.meaning.length > 0)).toBe(true);
  const low = checkCards(await fixtureDeckMaker.cards(input()));
  expect(low.every((c) => c.meaning == null)).toBe(true);
});

test('a phrase keeps a meaning that shares only one of its words', () => {
  const [card] = checkCards([{ ...raw(0, 'Comida a precio fijo que cambia cada día.'), word: 'el menú del día' }, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => raw(i))]);
  expect(card!.meaning).toBe('Comida a precio fijo que cambia cada día.');
});
