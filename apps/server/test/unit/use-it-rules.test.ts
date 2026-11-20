import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type CardsStore, type ReviewCard, type UsersStore } from '../../src/app.js';
import { AskSchema, type WordAsker } from '../../src/llm/ask-word.js';
import { claudeWordAsker } from '../../src/llm/claude.js';
import { fixtureUseItJudge, fixtureWordAsker } from '../../src/llm/fixture.js';
import { UseItSchema } from '../../src/llm/use-it.js';
import { canUseIt } from '../../src/review/srs.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

test('Use it is offered from stage 3, and for every card on the learner’s first review day', () => {
  expect([0, 1, 2, 3, 4, 5].map((stage) => canUseIt(stage, false))).toEqual([false, false, false, true, true, true]);
  expect([0, 1, 2].map((stage) => canUseIt(stage, true))).toEqual([true, true, true]);
});

test('the judge may add one follow-up question; without one the answer is still valid', async () => {
  const good = await fixtureUseItJudge.check({ word: 'la propina', translation: 'the tip', sentence: 'Dejé propina.', learningLanguage: 'es', nativeLanguage: 'en' });
  expect(good.good).toBe(true);
  expect(typeof good.followUp).toBe('string');
  expect(UseItSchema.parse({ good: true, lines: ['ok'] }).followUp ?? null).toBeNull();
  expect(() => UseItSchema.parse({ good: true, lines: ['ok'], followUp: 'x'.repeat(90) })).toThrow();
});

// The ask route
type Row = ReviewCard & { userId: string; known: boolean; hard: boolean; dueAt: Date | null };
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let rows: Row[];
let asker: WordAsker;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const cards: CardsStore = {
  round: async () => [],
  get: async (userId, id) => rows.find((r) => r.userId === userId && r.id === id) ?? null,
  save: async () => {},
  hardWords: async () => [],
  languages: async () => ({ learningLanguage: 'es', nativeLanguage: 'en' }),
};
const A = '11111111-1111-4111-8111-111111111111';
let alice: (path: string, body?: unknown) => Promise<Response>;
let bob: typeof alice;

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
  asker = fixtureWordAsker;
  rows = [{ id: A, userId: a, deckId: 'd', deckTopic: 'Ordering food', word: 'la propina', translation: 'the tip', example: 'e', exampleTranslation: 't', stage: 3, known: false, hard: false, dueAt: null }];
  const as = (token: string): typeof alice => (path, body) =>
    Promise.resolve(
      createApp({ keys: t.keys, issuer: ISSUER, users, cards, useItJudge: fixtureUseItJudge, wordAsker: { ask: (i) => asker.ask(i) } }).request(path, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  alice = as(await t.token({ sub: a }));
  bob = as(await t.token({ sub: b }));
});

test('ask: Kai answers in 1 to 3 lines and the card does not change', async () => {
  const res = await alice(`/v1/cards/${A}/ask`, { question: 'Why “le”?', sentence: 'Le dejé una propina.' });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { lines: string[] };
  expect(body.lines.length).toBeGreaterThanOrEqual(1);
  expect(body.lines.length).toBeLessThanOrEqual(3);
  expect(rows[0]).toMatchObject({ stage: 3, known: false, hard: false });
});

test('ask: another user 404, an empty or too long question 400, a failed AI call 502', async () => {
  expect((await bob(`/v1/cards/${A}/ask`, { question: 'Why?' })).status).toBe(404);
  expect((await alice(`/v1/cards/${A}/ask`, { question: '' })).status).toBe(400);
  expect((await alice(`/v1/cards/${A}/ask`, { question: 'x'.repeat(301) })).status).toBe(400);
  asker = { ask: async () => Promise.reject(new Error('model down')) };
  const failed = await alice(`/v1/cards/${A}/ask`, { question: 'Why?' });
  expect(failed.status).toBe(502);
  expect(await failed.json()).toEqual({ error: 'ask_failed' });
});

test('claudeWordAsker reads { lines } and refuses a bad answer', async () => {
  const fakeFetch = (text: string) => (async () => new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 })) as unknown as typeof fetch;
  const input = { word: 'la propina', translation: 'the tip', question: 'Why “le”?', sentence: 'Le dejé una propina.', learningLanguage: 'es', nativeLanguage: 'en' };
  expect(await claudeWordAsker('k', fakeFetch('{"lines": ["**Le** says who gets it."]}')).ask(input)).toEqual({ lines: ['**Le** says who gets it.'] });
  await expect(claudeWordAsker('k', fakeFetch('{"lines": []}')).ask(input)).rejects.toThrow();
  expect(AskSchema.safeParse({ lines: ['a', 'b', 'c', 'd'] }).success).toBe(false);
});
