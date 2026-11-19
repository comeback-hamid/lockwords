import { beforeAll, expect, test } from 'vitest';

import { createApp, type CardsStore, type DecksStore, type UsersStore } from '../../src/app.js';
import { pickRandomDeck } from '../../src/decks/random-words.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// The two remove routes with fake stores, and the number of the next Random Words deck.
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const never = async (): Promise<never> => {
  throw new Error('not used');
};
let calls: string[] = [];
let deckAnswer: 'removed' | 'not_found' | 'generating' = 'removed';
let cardAnswer = true;
const decks: DecksStore = { create: never, get: never, saveCards: never, remove: async (userId, id) => (calls.push(`deck ${userId} ${id}`), deckAnswer) };
const cards: CardsStore = { round: never, get: never, save: never, hardWords: never, languages: never, remove: async (userId, id) => (calls.push(`card ${userId} ${id}`), cardAnswer) };
const sub = crypto.randomUUID();
let del: (path: string, token?: string) => Promise<Response>;

beforeAll(async () => {
  const t = await makeTestKeys();
  const mine = await t.token({ sub });
  del = async (path, token = mine) => createApp({ keys: t.keys, issuer: ISSUER, users, decks, cards }).request(path, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
});

test('DELETE /v1/cards/{id}: 204 with no body when the store removed it, 404 when it did not', async () => {
  const id = crypto.randomUUID();
  calls = [];
  cardAnswer = true;
  const ok = await del(`/v1/cards/${id}`);
  expect(ok.status).toBe(204);
  expect(await ok.text()).toBe('');
  expect(calls).toEqual([`card ${sub} ${id}`]);
  cardAnswer = false;
  const missing = await del(`/v1/cards/${id}`);
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ error: 'not_found' });
});

test('DELETE /v1/decks/{id}: 204, 404 and 409 follow the store', async () => {
  const id = crypto.randomUUID();
  calls = [];
  deckAnswer = 'removed';
  expect((await del(`/v1/decks/${id}`)).status).toBe(204);
  expect(calls).toEqual([`deck ${sub} ${id}`]);
  deckAnswer = 'not_found';
  expect((await del(`/v1/decks/${id}`)).status).toBe(404);
  deckAnswer = 'generating';
  const busy = await del(`/v1/decks/${id}`);
  expect(busy.status).toBe(409);
  expect(await busy.json()).toEqual({ error: 'deck_generating' });
});

test('a malformed id is 404 and never reaches the store; no token is 401', async () => {
  calls = [];
  expect((await del('/v1/cards/nope')).status).toBe(404);
  expect((await del('/v1/decks/nope')).status).toBe(404);
  expect(calls).toEqual([]);
  expect((await del(`/v1/cards/${crypto.randomUUID()}`, 'bad')).status).toBe(401);
  expect((await del(`/v1/decks/${crypto.randomUUID()}`, 'bad')).status).toBe(401);
});

test('the next Random Words deck: a removed deck never takes a word, and its number is not used again', () => {
  // newest first
  expect(pickRandomDeck([{ id: 'a', count: 3, removed: true }])).toEqual({ id: null, number: 2 });
  expect(pickRandomDeck([{ id: 'b', count: 5 }, { id: 'a', count: 0, removed: true }])).toEqual({ id: 'b', number: 2 });
  expect(pickRandomDeck([{ id: 'b', count: 0, removed: true }, { id: 'a', count: 29 }])).toEqual({ id: 'a', number: 1 });
  expect(pickRandomDeck([{ id: 'b', count: 30 }, { id: 'a', count: 2, removed: true }])).toEqual({ id: null, number: 3 });
});
