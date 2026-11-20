import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let learner: (level: string, knownWords: number | null) => Promise<(path: string, method?: string, body?: unknown) => Promise<Response>>;

beforeAll(async () => {
  const t = await makeTestKeys();
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), profiles: createProfilesStore(db), decks: createDecksStore(db), deckMaker: fixtureDeckMaker, cards: createCardsStore(db) });
  learner = async (level, knownWords) => {
    const headers = { Authorization: `Bearer ${await t.token({ sub: crypto.randomUUID() })}`, 'Content-Type': 'application/json' };
    const call = async (path: string, method = 'GET', body?: unknown) => app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    await call('/v1/profile', 'PUT', { learningLanguage: 'es', nativeLanguage: 'en', level, knownWords, cefr: null, goal: 'travel', goalOther: null, interests: ['food'] });
    return call;
  };
});
afterAll(() => pool.end());

type Card = { word: string; translation: string; meaning?: string };
const makeDeck = async (call: Awaited<ReturnType<typeof learner>>) => {
  const deck = (await (await call('/v1/decks', 'POST', { topic: 'Ordering food' })).json()) as { id: string };
  return (await (await call(`/v1/decks/${deck.id}/generate`, 'POST')).json()) as { status: string; cards: Card[] };
};

test('an advanced learner: every card keeps its meaning, in the deck and in the round; the translation is still there', async () => {
  const call = await learner('advanced', 4600);
  const deck = await makeDeck(call);
  expect(deck.status).toBe('ready');
  expect(deck.cards[0]).toMatchObject({ word: 'la cuenta', translation: 'the bill', meaning: 'El papel que dice cuánto debes pagar.' });
  expect(deck.cards.every((c) => typeof c.meaning === 'string')).toBe(true);
  const round = ((await (await call('/v1/review')).json()) as { cards: Card[] }).cards;
  expect(round[1]).toMatchObject({ word: 'la propina', translation: 'the tip', meaning: 'Dinero extra que dejas por un buen servicio.' });
});

test('a beginner: no card has a meaning', async () => {
  const call = await learner('beginner', null);
  const deck = await makeDeck(call);
  expect(deck.cards.some((c) => 'meaning' in c)).toBe(false);
  const round = ((await (await call('/v1/review')).json()) as { cards: Card[] }).cards;
  expect(round.some((c) => 'meaning' in c)).toBe(false);
});
