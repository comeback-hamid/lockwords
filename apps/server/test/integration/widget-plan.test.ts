import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createUsersStore } from '../../src/db/users.js';
import { createWidgetStore } from '../../src/db/widget.js';
import { loadEnv } from '../../src/env.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// The widget plan through the real routes and the real database: only hard words, looks counted by time and kept.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let now = new Date('2026-11-25T09:00:00Z');
const userId = crypto.randomUUID();
let call: (path: string, method?: string, body?: unknown) => Promise<Response>;
type Plan = { slots: { at: string; cardId: string; word: string; look: number }[]; endsAt: string | null };
const plan = async () => (await (await call('/v1/widget/plan')).json()) as Plan;
const round = async (query = '') => ((await (await call(`/v1/review${query}`)).json()) as { cards: { id: string; word: string; lookOnly?: boolean }[] }).cards;
const looks = async () => (await db.execute(sql`select looks from widget_plans where user_id = ${userId}`)).rows[0]?.looks;
const card = async (word: string) => (await db.execute(sql`select c.id, c.stage, c.hard, c.due_at from cards c join decks d on d.id = c.deck_id where d.user_id = ${userId} and c.word = ${word}`)).rows[0] as { id: string; stage: number; hard: boolean; due_at: Date };

beforeAll(async () => {
  const t = await makeTestKeys();
  await db.execute(sql`insert into users (id, is_guest) values (${userId}, true)`);
  const deck = crypto.randomUUID();
  await db.execute(sql`insert into decks (id, user_id, topic, title, reason, cefr, status, word_count) values (${deck}, ${userId}, 'Food', 'Food title', 'r', 'B1', 'ready', 4)`);
  for (let p = 0; p < 4; p++) await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) values (${deck}, ${p}, ${`w${p}`}, ${`t${p}`}, 'e', 'et')`);
  const headers = { Authorization: `Bearer ${await t.token({ sub: userId })}`, 'Content-Type': 'application/json', 'X-Time-Zone': 'Europe/London' };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), cards: createCardsStore(db), widget: createWidgetStore(db), reviewNow: () => now });
  call = (path, method = 'GET', body) => Promise.resolve(app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
});
afterAll(() => pool.end());

test('no hard words: an empty plan', async () => {
  expect(await plan()).toEqual({ slots: [], endsAt: null });
});

test('two words swiped Hard take turns; passed slots become looks in the database; SRS is untouched', async () => {
  const cards = await round();
  for (const word of ['w1', 'w2']) {
    now = new Date(now.getTime() + 1000);
    expect((await call(`/v1/cards/${cards.find((c) => c.word === word)!.id}/swipe`, 'POST', { direction: 'hard' })).status).toBe(200);
  }
  const before = await card('w1');
  const first = await plan();
  expect(first.slots.slice(0, 4).map((s) => [s.word, s.look])).toEqual([['w1', 1], ['w2', 1], ['w1', 2], ['w2', 2]]);
  expect(new Set(first.slots.map((s) => s.word))).toEqual(new Set(['w1', 'w2'])); // w0 and w3 are not hard
  expect(await looks()).toEqual({});
  now = new Date('2026-11-25T10:35:00Z'); // 09:00, 09:30 and 10:00 are over
  const second = await plan();
  expect(await looks()).toEqual({ [before.id]: 2, [(await card('w2')).id]: 1 });
  expect(second.slots[0]).toMatchObject({ at: '2026-11-25T10:30:00.000Z', word: 'w2', look: 2 });
  expect(await card('w1')).toEqual(before); // stage, hard mark and due date as they were
});

test('the tapped word is the first card: a look card today, because it comes back tomorrow', async () => {
  const w1 = await card('w1');
  const cards = await round(`?first=${w1.id}`);
  expect(cards[0]).toMatchObject({ id: w1.id, lookOnly: true });
  expect(cards.slice(1).map((c) => c.word)).toEqual(['w0', 'w3']);
  expect((await call(`/v1/cards/${w1.id}/swipe`, 'POST', { direction: 'easy' })).status).toBe(409);
  now = new Date('2026-11-26T10:00:00Z'); // the next day it is due: a normal first card
  const tomorrow = await round(`?first=${w1.id}`);
  expect(tomorrow[0]).toMatchObject({ id: w1.id });
  expect(tomorrow[0]).not.toHaveProperty('lookOnly');
  expect(tomorrow.filter((c) => c.id === w1.id)).toHaveLength(1);
});

test('swiped Hard again: its looks start at 0; a word that is no longer hard leaves the plan', async () => {
  const w1 = await card('w1');
  const w2 = await card('w2');
  await plan(); // counts the slots of the day before
  expect(((await looks()) as Record<string, number>)[w1.id]).toBeGreaterThan(0);
  expect((await call(`/v1/cards/${w1.id}/swipe`, 'POST', { direction: 'hard' })).status).toBe(200);
  expect((await looks()) as Record<string, number>).not.toHaveProperty(w1.id);
  expect((await call(`/v1/cards/${w2.id}/swipe`, 'POST', { direction: 'known' })).status).toBe(200);
  const p = await plan();
  expect(new Set(p.slots.map((s) => s.word))).toEqual(new Set(['w1']));
  expect(p.slots[0]!.look).toBe(1);
});

test('another learner’s card as `first` is ignored', async () => {
  const other = crypto.randomUUID();
  await db.execute(sql`insert into users (id, is_guest) values (${other}, true)`);
  const deck = crypto.randomUUID();
  await db.execute(sql`insert into decks (id, user_id, topic, title, reason, cefr, status, word_count) values (${deck}, ${other}, 'Food', 't', 'r', 'B1', 'ready', 1)`);
  const id = crypto.randomUUID();
  await db.execute(sql`insert into cards (id, deck_id, position, word, translation, example, example_translation) values (${id}, ${deck}, 0, 'theirs', 't', 'e', 'et')`);
  expect((await round(`?first=${id}`)).map((c) => c.word)).not.toContain('theirs');
});
