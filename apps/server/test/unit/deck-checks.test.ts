import { expect, test } from 'vitest';

import type { DecksStore, ProfilesStore } from '../../src/app.js';
import { makeDeckCards } from '../../src/decks/jobs.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { checkCards, type DeckMaker, type NewCard, type RawCard } from '../../src/llm/make-deck.js';

const good: NewCard[] = checkCards(await fixtureDeckMaker.cards({ topic: 'Ordering food', learningLanguage: 'es', nativeLanguage: 'en', cefr: 'A2', level: 'some_basics', knownWords: null, goal: 'travel', goalOther: null, interests: [] }));

test('duplicates (other case) are dropped and asterisks removed', () => {
  const raw: RawCard[] = [...good.slice(0, 9), { ...good[0]!, word: 'LA CUENTA' }, good[9]!].map((c, i) => (i === 2 ? { ...c, example: 'Quiero *pedir* una sopa.' } : c));
  const cards = checkCards(raw);
  expect(cards).toHaveLength(10);
  expect(cards[2]!.example).toBe('Quiero pedir una sopa.');
  expect(cards.filter((c) => c.word.toLowerCase() === 'la cuenta')).toHaveLength(1);
});

test('items with no word, translation or example are dropped; fewer than 10 fails', () => {
  const raw: RawCard[] = good.map((c, i) => (i < 2 ? { ...c, translation: '' } : c));
  expect(() => checkCards(raw)).toThrow();
});

test('more than 10 keeps the first 10', () => {
  const extra = { word: 'el vino', translation: 'the wine', example: 'Un vino, por favor.', exampleTranslation: 'A wine, please.' };
  expect(checkCards([...good, extra]).map((c) => c.word)).toEqual(good.map((c) => c.word));
});

// The job with a clock the test moves by hand.
function setup(tries: (() => Promise<RawCard[]>)[], clock: { now: number }) {
  let saved: NewCard[] | null = null;
  let status = 'generating';
  const deck = { id: 'd', topic: 'Ordering food', title: 't', reason: 'r', cefr: 'A2', wordCount: 10, status, cards: [] };
  const decks = { get: async () => ({ ...deck, status }), saveCards: async (_: string, c: NewCard[]) => ((saved = c), (status = 'ready')) } as unknown as DecksStore;
  const profiles = { get: async () => ({ learningLanguage: 'es', nativeLanguage: 'en', level: 'some_basics', knownWords: 900, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] }) } as unknown as ProfilesStore;
  let n = 0;
  const deckMaker: DeckMaker = { propose: fixtureDeckMaker.propose, cards: () => tries[n++]!() };
  return { run: () => makeDeckCards({ profiles, decks, deckMaker, now: () => clock.now }, 'u', 'd'), saved: () => saved, calls: () => n };
}

test('fast failure, then success → ready with those cards', async () => {
  const clock = { now: 0 };
  const s = setup([async () => { clock.now += 2000; throw new Error('busy'); }, async () => good], clock);
  expect(await s.run()).toBe(true);
  expect(s.calls()).toBe(2);
  expect(s.saved()).toHaveLength(10);
});

test('slow failure → no second try', async () => {
  const clock = { now: 0 };
  const s = setup([async () => { clock.now += 13_000; throw new Error('slow'); }, async () => good], clock);
  expect(await s.run()).toBe(false);
  expect(s.calls()).toBe(1);
  expect(s.saved()).toBeNull();
});

test('two fast failures → failed, nothing saved', async () => {
  const clock = { now: 0 };
  const s = setup([async () => [], async () => good.slice(0, 3)], clock);
  expect(await s.run()).toBe(false);
  expect(s.calls()).toBe(2);
  expect(s.saved()).toBeNull();
});

test('the job sends the learner to the deck maker', async () => {
  let got: unknown;
  const decks = { get: async () => ({ id: 'd', topic: 'Ordering food', cefr: 'A2', status: 'generating' }), saveCards: async () => {} } as unknown as DecksStore;
  const profiles = { get: async () => ({ learningLanguage: 'es', nativeLanguage: 'en', level: 'some_basics', knownWords: 900, cefr: 'A2', goal: 'other', goalOther: 'for my wife', interests: ['food'] }) } as unknown as ProfilesStore;
  const deckMaker: DeckMaker = { propose: fixtureDeckMaker.propose, cards: async (i) => ((got = i), good) };
  await makeDeckCards({ profiles, decks, deckMaker }, 'u', 'd');
  expect(got).toMatchObject({ topic: 'Ordering food', level: 'some_basics', knownWords: 900, goal: 'other', goalOther: 'for my wife', interests: ['food'] });
});
