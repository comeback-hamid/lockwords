import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let now = new Date('2026-11-20T10:00:00Z');
let userId: string;
let call: (path: string, method?: string, body?: unknown) => Promise<Response>;

type Card = { id: string; word: string; stage: number };
const round = async () => ((await (await call('/v1/review')).json()) as { cards: Card[] }).cards;
const swipe = (id: string, direction: string) => {
  now = new Date(now.getTime() + 1000); // every swipe has its own second, as on a phone
  return call(`/v1/cards/${id}/swipe`, 'POST', { direction });
};
const summary = async () => (await (await call('/v1/review/summary')).json()) as { name: string | null; streakDays: number; today: { words: number; minutes: number; easy: number; hard: number; known: number; stages: number[] } };
const tick = (seconds: number) => (now = new Date(now.getTime() + seconds * 1000));

async function userWith(n: number, name?: string) {
  userId = crypto.randomUUID();
  await db.execute(sql`insert into users (id, is_guest) values (${userId}, true)`);
  if (name) await db.execute(sql`insert into profiles (user_id, learning_language, native_language, level, goal, interests, name) values (${userId}, 'es', 'en', 'beginner', 'travel', '{}', ${name})`);
  const deck = crypto.randomUUID();
  await db.execute(sql`insert into decks (id, user_id, topic, title, reason, cefr, status, word_count) values (${deck}, ${userId}, 'Food', 't', 'r', 'A1', 'ready', ${n})`);
  for (let p = 0; p < n; p++) await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) values (${deck}, ${p}, ${`w${p}`}, 't', 'e', 'et')`);
  const headers = { Authorization: `Bearer ${await t.token({ sub: userId })}`, 'Content-Type': 'application/json', 'X-Time-Zone': 'Europe/London' };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), profiles: createProfilesStore(db), cards: createCardsStore(db), reviewNow: () => now });
  call = (path, method = 'GET', body) => Promise.resolve(app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(() => {
  now = new Date('2026-11-20T10:00:00Z');
});
afterAll(() => pool.end());

test('undo takes back the last swipe: the card is as before and in the round again; a second undo is refused', async () => {
  await userWith(2);
  const [a, b] = await round();
  await swipe(a!.id, 'easy');
  await swipe(b!.id, 'known');
  const undone = await call('/v1/review/undo', 'POST');
  expect(undone.status).toBe(200);
  expect(await undone.json()).toMatchObject({ card: { id: b!.id, word: 'w1', stage: 0 } });
  expect((await db.execute(sql`select known, stage from cards where id = ${b!.id}`)).rows[0]).toEqual({ known: false, stage: 0 });
  expect((await round()).map((c) => c.id)).toEqual([b!.id]);
  const again = await call('/v1/review/undo', 'POST');
  expect(again.status).toBe(409);
  expect(await again.json()).toEqual({ error: 'nothing_to_undo' });
  expect((await db.execute(sql`select stage from cards where id = ${a!.id}`)).rows[0]).toEqual({ stage: 2 }); // the older swipe stays
});

test('nothing swiped today: undo is refused', async () => {
  await userWith(1);
  expect((await call('/v1/review/undo', 'POST')).status).toBe(409);
});

test('an undone swipe brings the card back and counts nowhere', async () => {
  await userWith(21);
  const first = await round();
  expect(first).toHaveLength(21); // no daily limit of new words
  for (const c of first) await swipe(c.id, 'easy');
  expect(await round()).toEqual([]);
  await call('/v1/review/undo', 'POST');
  expect(await round()).toHaveLength(1); // the undone card is back
  expect((await summary()).today.words).toBe(20);
});

test('undo after a first Hard takes the card out of "again"', async () => {
  await userWith(2);
  const [a, b] = await round();
  await swipe(a!.id, 'hard');
  expect((await round()).map((c) => c.id)).toEqual([b!.id, a!.id]);
  await call('/v1/review/undo', 'POST');
  expect((await round()).map((c) => c.id)).toEqual([a!.id, b!.id]);
  expect(await (await call('/v1/hard-words')).json()).toEqual({ words: [] });
});

test('summary: name, streak over review days, today’s numbers', async () => {
  await userWith(6, 'Maya');
  expect(await summary()).toEqual({ day: '2026-11-20', name: 'Maya', streakDays: 0, today: { words: 0, minutes: 0, easy: 0, hard: 0, known: 0, stages: [] } });
  const cards = await round();
  now = new Date('2026-11-18T10:00:00Z');
  await swipe(cards[0]!.id, 'easy');
  now = new Date('2026-11-19T23:30:00Z');
  await swipe(cards[1]!.id, 'easy');
  now = new Date('2026-11-20T10:00:00Z');
  expect((await summary()).streakDays).toBe(2); // today has none yet: the streak ends yesterday
  await swipe(cards[2]!.id, 'easy');
  tick(10);
  await swipe(cards[3]!.id, 'hard');
  tick(10);
  await swipe(cards[4]!.id, 'known');
  tick(1200); // a long break
  await swipe(cards[3]!.id, 'easy');
  expect(await summary()).toEqual({ day: '2026-11-20', name: 'Maya', streakDays: 3, today: { words: 3, minutes: 2, easy: 2, hard: 0, known: 1, stages: [2, 2, 0] } });
});

test('summary without a profile has no name', async () => {
  await userWith(1);
  expect((await summary()).name).toBeNull();
});
