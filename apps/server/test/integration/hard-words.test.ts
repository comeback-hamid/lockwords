import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createProgressStore } from '../../src/db/progress.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// Hamid's report of 2026-11-23: after several Hard swipes the hard words list was empty and no number showed them.
// These tests swipe Hard through the real routes and the real database, then read the list and the count.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let now = new Date('2026-11-23T10:00:00Z');
let userId: string;
let call: (path: string, method?: string, body?: unknown) => Promise<Response>;
const get = async <T>(path: string) => (await (await call(path)).json()) as T;
type Card = { id: string; word: string };
const round = async () => (await get<{ cards: Card[] }>('/v1/review')).cards;
const swipe = async (id: string, direction: string) => {
  now = new Date(now.getTime() + 1000);
  const res = await call(`/v1/cards/${id}/swipe`, 'POST', { direction });
  expect(res.status).toBe(200);
};
const hardWords = async () => (await get<{ words: { word: string }[] }>('/v1/hard-words')).words.map((w) => w.word).sort();
const hardCount = async () => (await get<{ hard: number }>('/v1/progress')).hard;

async function userWith(n: number) {
  userId = crypto.randomUUID();
  await db.execute(sql`insert into users (id, is_guest) values (${userId}, true)`);
  const deck = crypto.randomUUID();
  await db.execute(sql`insert into decks (id, user_id, topic, title, reason, cefr, status, word_count) values (${deck}, ${userId}, 'Food', 'Food title', 'r', 'B1', 'ready', ${n})`);
  for (let p = 0; p < n; p++) await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) values (${deck}, ${p}, ${`w${p}`}, ${`t${p}`}, 'e', 'et')`);
  const headers = { Authorization: `Bearer ${await t.token({ sub: userId })}`, 'Content-Type': 'application/json', 'X-Time-Zone': 'Europe/London' };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), decks: createDecksStore(db), cards: createCardsStore(db), progress: createProgressStore(db), reviewNow: () => now });
  call = (path, method = 'GET', body) => Promise.resolve(app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  return deck;
}

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(() => {
  now = new Date('2026-11-23T10:00:00Z');
});
afterAll(() => pool.end());

test('swipe Hard on several cards: the list has them, and Progress and the deck count them', async () => {
  await userWith(6);
  expect(await hardCount()).toBe(0);
  const first = await round();
  for (const c of first.slice(0, 3)) await swipe(c.id, 'hard');
  for (const c of first.slice(3)) await swipe(c.id, 'easy');
  expect(await hardWords()).toEqual(['w0', 'w1', 'w2']);
  expect(await hardCount()).toBe(3);
  expect((await get<{ decks: { hard: number }[] }>('/v1/decks')).decks[0]!.hard).toBe(3);
});

test('the second showing the same day: Hard or Easy keeps the word hard, "I know it" takes it out', async () => {
  await userWith(4);
  for (const c of await round()) await swipe(c.id, c.word === 'w3' ? 'easy' : 'hard');
  const again = await round(); // the three Hard cards come back once
  expect(again.map((c) => c.word).sort()).toEqual(['w0', 'w1', 'w2']);
  const by = (word: string) => again.find((c) => c.word === word)!.id;
  await swipe(by('w0'), 'hard');
  await swipe(by('w1'), 'easy');
  await swipe(by('w2'), 'known');
  expect(await hardWords()).toEqual(['w0', 'w1']);
  expect(await hardCount()).toBe(2);
});

test('a hard word leaves the list when it reaches level 3', async () => {
  await userWith(1);
  const [card] = await round();
  await swipe(card!.id, 'hard'); // level 1
  await swipe(card!.id, 'easy'); // the second showing: level 2, still hard
  expect(await hardCount()).toBe(1);
  now = new Date('2026-11-27T10:00:00Z'); // due again
  await swipe(card!.id, 'easy'); // level 3
  expect(await hardWords()).toEqual([]);
  expect(await hardCount()).toBe(0);
});

test('more than 20 hard words: the list has all of them, so it matches the count', async () => {
  await userWith(20);
  for (const c of await round()) await swipe(c.id, 'hard');
  for (const c of await round()) await swipe(c.id, 'hard');
  now = new Date('2026-11-24T10:00:00Z');
  await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) select id, 20 + n, 'x' || n, 't', 'e', 'et' from decks, generate_series(0, 4) n where user_id = ${userId}`);
  for (const c of (await round()).filter((c) => c.word.startsWith('x'))) await swipe(c.id, 'hard');
  expect(await hardCount()).toBe(25);
  expect(await hardWords()).toHaveLength(25);
});

test('Progress and the deck list carry what the page needs: the word count of each deck and its level', async () => {
  await userWith(6);
  const p = await get<{ deckWords: number[]; trees: number[][] }>('/v1/progress');
  expect(p.deckWords).toEqual([6]);
  expect(p.trees).toEqual([[]]);
  expect((await get<{ decks: { cefr: string; words: number }[] }>('/v1/decks')).decks[0]).toMatchObject({ cefr: 'B1', words: 6 });
});
