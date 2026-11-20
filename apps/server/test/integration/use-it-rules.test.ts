import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { fixtureUseItJudge, fixtureWordAsker } from '../../src/llm/fixture.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let now = new Date('2026-11-20T10:00:00Z');
let userId: string;
let call: (path: string, method?: string, body?: unknown) => Promise<Response>;

type Card = { id: string; word: string; stage: number; canUseIt: boolean };
const round = async () => ((await (await call('/v1/review')).json()) as { cards: Card[] }).cards;
const step = () => (now = new Date(now.getTime() + 1000));
const swipe = (id: string, direction: string) => (step(), call(`/v1/cards/${id}/swipe`, 'POST', { direction }));
const useIt = async (id: string, sentence: string) => (step(), (await (await call(`/v1/cards/${id}/use-it`, 'POST', { sentence })).json()) as { good: boolean; movedUp: boolean; stage: number; followUp: string | null });
const eventsOf = async (id: string) => (await db.execute(sql`select kind from review_events where card_id = ${id} order by created_at`)).rows.map((r) => r.kind);

async function userWith(n: number) {
  userId = crypto.randomUUID();
  await db.execute(sql`insert into users (id, is_guest) values (${userId}, true)`);
  const deck = crypto.randomUUID();
  await db.execute(sql`insert into decks (id, user_id, topic, title, reason, cefr, status, word_count) values (${deck}, ${userId}, 'Food', 't', 'r', 'A1', 'ready', ${n})`);
  for (let p = 0; p < n; p++) await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) values (${deck}, ${p}, ${`palabra${p}`}, 't', 'e', 'et')`);
  const headers = { Authorization: `Bearer ${await t.token({ sub: userId })}`, 'Content-Type': 'application/json', 'X-Time-Zone': 'Europe/London' };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), cards: createCardsStore(db), useItJudge: fixtureUseItJudge, wordAsker: fixtureWordAsker, reviewNow: () => now });
  call = (path, method = 'GET', body) => Promise.resolve(app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(() => {
  now = new Date('2026-11-20T10:00:00Z');
});
afterAll(() => pool.end());

test('first review day: every card offers Use it; a good sentence counts like Easy, once, with one history row', async () => {
  await userWith(3);
  const cards = await round();
  expect(cards.map((c) => c.canUseIt)).toEqual([true, true, true]);
  const a = cards[0]!;
  expect(await useIt(a.id, 'Mi palabra0 es buena.')).toMatchObject({ good: true, movedUp: true, stage: 2, followUp: 'Can I say it another way?' });
  expect(await useIt(a.id, 'Otra palabra0 aquí.')).toMatchObject({ good: true, movedUp: false, stage: 2 }); // the same day again
  expect(await eventsOf(a.id)).toEqual(['use_it']);
  expect((await round()).map((c) => c.id)).not.toContain(a.id); // done for today
  expect((await swipe(a.id, 'easy')).status).toBe(409);
});

test('a weak sentence changes nothing and has no follow-up', async () => {
  await userWith(1);
  const [a] = await round();
  expect(await useIt(a!.id, 'No tiene la palabra.')).toMatchObject({ good: false, movedUp: false, stage: 0, followUp: null });
  expect(await eventsOf(a!.id)).toEqual([]);
});

test('later days: Use it is offered from stage 3 only, and a card below it does not move', async () => {
  await userWith(2);
  const [a, b] = await round();
  await swipe(a!.id, 'easy'); // day 1: stage 2
  await swipe(b!.id, 'easy');
  await db.execute(sql`update cards set stage = 3, due_at = ${new Date('2026-11-23T09:00:00Z')} where id = ${b!.id}`);
  now = new Date('2026-11-23T10:00:00Z'); // both are due
  const later = await round();
  expect(Object.fromEntries(later.map((c) => [c.word, c.canUseIt]))).toEqual({ palabra0: false, palabra1: true });
  expect(await useIt(a!.id, 'Mi palabra0 otra vez.')).toMatchObject({ good: true, movedUp: false, stage: 2 });
  expect(await useIt(b!.id, 'Mi palabra1 otra vez.')).toMatchObject({ good: true, movedUp: true, stage: 4 });
});

test('a card that is not in today’s round gets the feedback but does not move', async () => {
  await userWith(1);
  const [a] = await round();
  await swipe(a!.id, 'easy');
  expect(await useIt(a!.id, 'Mi palabra0 es buena.')).toMatchObject({ good: true, movedUp: false, stage: 2 });
});

test('undo gives the card back with its Use it flag; ask never changes the card', async () => {
  await userWith(1);
  const [a] = await round();
  await swipe(a!.id, 'known');
  expect(await (await call('/v1/review/undo', 'POST')).json()).toMatchObject({ card: { id: a!.id, canUseIt: true } });
  const res = await call(`/v1/cards/${a!.id}/ask`, 'POST', { question: 'Why?' });
  expect(res.status).toBe(200);
  expect(await eventsOf(a!.id)).toEqual(['known']); // the undone swipe row stays (marked undone); ask adds none
  expect((await db.execute(sql`select stage, known from cards where id = ${a!.id}`)).rows[0]).toEqual({ stage: 0, known: false });
});
