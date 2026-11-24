import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// The review rules with the real database. The clock is set by the test.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let now = new Date('2026-11-20T10:00:00Z');
let userId: string;
let call: (path: string, method?: string, body?: unknown) => Promise<Response>;

type Card = { id: string; word: string; stage: number };
const round = async () => ((await (await call('/v1/review')).json()) as { cards: Card[] }).cards;
const swipe = (id: string, direction: string) => call(`/v1/cards/${id}/swipe`, 'POST', { direction });
const row = async (id: string) => (await db.execute(sql`select stage, hard, known from cards where id = ${id}`)).rows[0];
const events = async () => Number((await db.execute(sql`select count(*) as n from review_events where user_id = ${userId}`)).rows[0]?.n);

// A user with one ready deck of `n` new words.
async function userWith(n: number) {
  userId = crypto.randomUUID();
  await db.execute(sql`insert into users (id, is_guest) values (${userId}, true)`);
  const deck = crypto.randomUUID();
  await db.execute(sql`insert into decks (id, user_id, topic, title, reason, cefr, status, word_count) values (${deck}, ${userId}, 'Food', 't', 'r', 'A1', 'ready', ${n})`);
  for (let p = 0; p < n; p++) await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) values (${deck}, ${p}, ${`w${p}`}, 't', 'e', 'et')`);
  const headers = { Authorization: `Bearer ${await t.token({ sub: userId })}`, 'Content-Type': 'application/json', 'X-Time-Zone': 'Europe/London' };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), cards: createCardsStore(db), reviewNow: () => now });
  call = (path, method = 'GET', body) => Promise.resolve(app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(() => {
  now = new Date('2026-11-20T10:00:00Z');
});
afterAll(() => pool.end());

test('no daily limit of new words: every new word is in the round at once (Hamid, 2026-11-24)', async () => {
  await userWith(30);
  const first = await round();
  expect(first.map((c) => c.word)).toEqual(Array.from({ length: 30 }, (_, i) => `w${i}`));
  for (const c of first) expect((await swipe(c.id, 'easy')).status).toBe(200);
  expect(await round()).toEqual([]); // all swiped today
});

test('a card is due for its whole review day, and the day starts at 04:00', async () => {
  await userWith(1);
  const [card] = await round();
  now = new Date('2026-11-20T23:00:00Z');
  await db.execute(sql`update cards set stage = 1, due_at = ${new Date('2026-11-21T23:00:00Z')} where id = ${card!.id}`); // "back in 1 day", swiped at 23:00
  expect(await round()).toEqual([]);
  now = new Date('2026-11-21T03:00:00Z'); // after midnight: still the same review day
  expect(await round()).toEqual([]);
  now = new Date('2026-11-21T08:00:00Z'); // next morning: due, long before 23:00
  expect((await round()).map((c) => c.id)).toEqual([card!.id]);
  expect(await (await swipe(card!.id, 'easy')).json()).toMatchObject({ stage: 2, backInDays: 3 });
});

test('Hard does not come back the same day; a second swipe is refused (Hamid, 2026-11-24)', async () => {
  await userWith(2);
  const [a, b] = await round();
  expect(await (await swipe(a!.id, 'hard')).json()).toMatchObject({ stage: 1, hard: true, backInDays: 1, again: false });
  expect((await round()).map((c) => c.id)).toEqual([b!.id]);
  const second = await swipe(a!.id, 'easy');
  expect(second.status).toBe(409);
  expect(await second.json()).toEqual({ error: 'not_due' });
  now = new Date('2026-11-21T10:00:00Z');
  expect((await round()).map((c) => c.id)).toEqual([a!.id, b!.id]); // due the next day, before the new word
});

test('after Hard, Easy the next day gives stage 2 and the word stays hard until stage 3', async () => {
  await userWith(1);
  const [a] = await round();
  await swipe(a!.id, 'hard');
  now = new Date('2026-11-21T10:00:00Z');
  expect(await (await swipe(a!.id, 'easy')).json()).toMatchObject({ stage: 2, hard: true, backInDays: 3, again: false });
  expect(await (await call('/v1/hard-words')).json()).toEqual({ words: [{ word: 'w0', translation: 't' }] });
  now = new Date('2026-11-24T10:00:00Z');
  expect(await (await swipe(a!.id, 'easy')).json()).toMatchObject({ stage: 3, hard: false });
  expect(await (await call('/v1/hard-words')).json()).toEqual({ words: [] });
});

test('a double send and a swipe on a card that is not due change nothing; every accepted swipe has one history row', async () => {
  await userWith(1);
  const [a] = await round();
  expect((await swipe(a!.id, 'easy')).status).toBe(200);
  expect((await swipe(a!.id, 'easy')).status).toBe(409); // the same swipe again
  expect(await row(a!.id)).toMatchObject({ stage: 2 });
  expect(await events()).toBe(1);
  const event = (await db.execute(sql`select kind, review_day::text as day, before, after from review_events where user_id = ${userId}`)).rows[0]!;
  expect(event).toMatchObject({ kind: 'easy', day: '2026-11-20', before: { stage: 0, known: false, hard: false, dueAt: null }, after: { stage: 2, known: false, hard: false } });
  now = new Date('2026-11-21T10:00:00Z'); // due in 3 days: not yet
  expect((await swipe(a!.id, 'known')).status).toBe(409);
  expect(await row(a!.id)).toMatchObject({ known: false });
  expect(await events()).toBe(1);
});
