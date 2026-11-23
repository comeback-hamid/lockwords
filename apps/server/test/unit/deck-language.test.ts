import { expect, test } from 'vitest';

import { createApp, type DecksStore, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { claudeDeckMaker } from '../../src/llm/claude.js';
import { deckPrompt, ProposalSchema, type DeckInput, type DeckMaker } from '../../src/llm/make-deck.js';
import type { Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// The bug of 2026-11-23: learning English, native Persian, and the first deck came out in Persian.
// A deck (title, reason, words, examples) is always in the language being learned. The native language is only the translation under it.
const persian: Profile = { learningLanguage: 'en', nativeLanguage: 'fa', level: 'some_basics', knownWords: 1850, cefr: 'A2+', goal: 'travel', goalOther: null, interests: ['food'] };
const input: DeckInput = { ...persian, cefr: 'A2+', topic: 'سفارش غذا' }; // the topic the app sends is the translated idea: Persian

type Call = { body: { messages: { content: string }[] } };
const fakeFetch = (text: string, calls: Call[]) =>
  (async (_url: string, init: RequestInit) => {
    calls.push({ body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 });
  }) as unknown as typeof fetch;

test('the first deck title is asked for in the learning language, its translation in the native language', async () => {
  const calls: Call[] = [];
  const answer = { title: 'Order food and pay the bill.', titleTranslation: 'غذا سفارش بده و صورت‌حساب را بپرداز.', reason: 'For your trip' };
  const proposal = await claudeDeckMaker('k', fakeFetch(JSON.stringify(answer), calls)).propose(input);
  expect(proposal).toEqual(answer);
  const prompt = calls[0]!.body.messages[0]!.content;
  expect(prompt).toContain('"title": one short sentence in English');
  expect(prompt).toContain('"titleTranslation": the same sentence in Persian');
  expect(prompt).toContain('"reason": in English');
  expect(prompt).not.toMatch(/sentence in (fa|Persian) saying/);
  // Language names, not codes: "fa" alone tells a model little.
  expect(prompt).toContain('speaks Persian and is learning English');
});

test('a title with no translation still passes (older answers, the stand-in)', () => {
  expect(ProposalSchema.parse({ title: 'Order food', reason: 'For your trip' })).toEqual({ title: 'Order food', reason: 'For your trip' });
});

test('the words prompt says the deck is in the learning language even when the request is in another language', () => {
  const p = deckPrompt(input);
  expect(p).toContain('Learning: English');
  expect(p).toContain('Native language: Persian');
  expect(p).toContain('The request above may be written in Persian or any other language. The deck is still in English: every word and every example is in English, never in Persian. Only "translation" and "example_translation" are in Persian.');
  expect(p).toContain('- word: in English');
  expect(p).toContain('- translation: the word in Persian');
});

test('POST /v1/decks keeps the title translation of the first deck', async () => {
  const t = await makeTestKeys();
  const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
  const profiles: ProfilesStore = { upsert: async (_u, p) => p, get: async () => persian, setChat: async () => true };
  let saved: Parameters<DecksStore['create']>[1] | undefined;
  const decks: DecksStore = {
    create: async (_userId, d) => ((saved = d), { ...d, id: crypto.randomUUID(), wordCount: 10, status: 'proposed' as const, cards: [] }),
    get: async () => null,
    saveCards: async () => {
      throw new Error('not used');
    },
  };
  const deckMaker: DeckMaker = { propose: async () => ({ title: 'Order food.', titleTranslation: 'غذا سفارش بده.', reason: 'For your trip' }), cards: async () => [] };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, decks, deckMaker });
  const res = await app.request('/v1/decks', { method: 'POST', headers: { Authorization: `Bearer ${await t.token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: 'سفارش غذا' }) });
  expect(res.status).toBe(201);
  expect(await res.json()).toMatchObject({ title: 'Order food.', titleTranslation: 'غذا سفارش بده.' });
  expect(saved).toMatchObject({ title: 'Order food.', titleTranslation: 'غذا سفارش بده.' });
});
