import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type CardsStore, type ReviewCard, type UsersStore } from '../../src/app.js';
import type { CardState } from '../../src/review/srs.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// A tap on the widget opens Review with that word as the first card (Hamid, 2026-11-25).
type Row = ReviewCard & CardState;
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const row = (id: string, over: Partial<Row> = {}): Row => ({ id, deckId: 'd', deckTopic: 'Food', word: `w-${id.slice(-1)}`, translation: 't', example: 'e', exampleTranslation: 'et', stage: 1, known: false, hard: true, dueAt: new Date('2026-11-25T00:00:00Z'), ...over });
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let round: Row[];
let all: Row[];
let call: (path: string, method?: string, body?: unknown) => Promise<Response>;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const cardsOf = async (path: string) => ((await (await call(path)).json()) as { cards: { id: string; lookOnly?: boolean }[] }).cards;

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  round = [row(A), row(B)];
  all = [...round, row(C, { dueAt: new Date('2026-11-26T10:00:00Z') })]; // C was swiped Hard today: due tomorrow
  const cards = { round: async () => round, get: async (_u: string, id: string) => all.find((c) => c.id === id) ?? null, today: async () => ({ swipesToday: [], newStartedToday: 0 }), saveSwipe: async () => {} } as unknown as CardsStore;
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, cards, reviewNow: () => new Date('2026-11-25T10:00:00Z') });
  const headers = { Authorization: `Bearer ${await t.token()}`, 'Content-Type': 'application/json' };
  call = (path, method = 'GET', body) => Promise.resolve(app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
});

test('a card that is due today is first, once, as a normal card', async () => {
  expect(await cardsOf(`/v1/review?first=${B}`)).toMatchObject([{ id: B }, { id: A }]);
  expect((await cardsOf(`/v1/review?first=${B}`))[0]).not.toHaveProperty('lookOnly');
});

test('a card that is not due today is first as a look card, and cannot be swiped', async () => {
  const cards = await cardsOf(`/v1/review?first=${C}`);
  expect(cards.map((c) => c.id)).toEqual([C, A, B]);
  expect(cards[0]!.lookOnly).toBe(true);
  expect(cards[1]).not.toHaveProperty('lookOnly');
  expect((await call(`/v1/cards/${C}/swipe`, 'POST', { direction: 'easy' })).status).toBe(409);
});

test('an unknown id, a known card or a bad id: the usual round', async () => {
  expect((await cardsOf('/v1/review?first=00000000-0000-4000-8000-0000000000ff')).map((c) => c.id)).toEqual([A, B]);
  expect((await cardsOf('/v1/review?first=not-an-id')).map((c) => c.id)).toEqual([A, B]);
  all.push(row('00000000-0000-4000-8000-00000000000d', { known: true }));
  expect((await cardsOf('/v1/review?first=00000000-0000-4000-8000-00000000000d')).map((c) => c.id)).toEqual([A, B]);
});

test('no first: the round as before', async () => {
  expect((await cardsOf('/v1/review')).map((c) => c.id)).toEqual([A, B]);
});
