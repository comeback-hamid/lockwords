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

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let now = new Date('2026-11-20T10:00:00Z');
let userId: string;
let call: (path: string, method?: string, body?: unknown) => Promise<Response>;
const get = async <T>(path: string) => (await (await call(path)).json()) as T;
const swipe = (id: string, direction: string) => {
  now = new Date(now.getTime() + 1000);
  return call(`/v1/cards/${id}/swipe`, 'POST', { direction });
};
type Card = { id: string; word: string; stage: number; hard?: boolean; known?: boolean };
type Progress = { total: number; new: number; learning: number; mastered: number; decks: number; goal: number; masterBy: string; grid: number[] };
type DeckRow = { id: string; topic: string; words: number; learning: number; hard: number; stages: number[] };

async function newUser() {
  userId = crypto.randomUUID();
  await db.execute(sql`insert into users (id, is_guest) values (${userId}, true)`);
  const headers = { Authorization: `Bearer ${await t.token({ sub: userId })}`, 'Content-Type': 'application/json', 'X-Time-Zone': 'Europe/London' };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), decks: createDecksStore(db), cards: createCardsStore(db), progress: createProgressStore(db), reviewNow: () => now });
  call = (path, method = 'GET', body) => Promise.resolve(app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
}
// A ready deck of `n` new words, made `minutesAgo` minutes before now.
async function deck(topic: string, n: number, minutesAgo: number, status = 'ready') {
  const id = crypto.randomUUID();
  await db.execute(sql`insert into decks (id, user_id, topic, title, reason, cefr, status, word_count, created_at) values (${id}, ${userId}, ${topic}, ${`${topic} title`}, 'r', 'A1', ${status}, ${n}, now() - make_interval(mins => ${minutesAgo}))`);
  for (let p = 0; p < n; p++) await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) values (${id}, ${p}, ${`${topic}-${p}`}, 't', 'e', 'et')`);
  return id;
}
const cardsOf = async (deckId: string) => (await get<{ cards: Card[] }>(`/v1/decks/${deckId}`)).cards;

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  now = new Date('2026-11-20T10:00:00Z');
  await newUser();
});
afterAll(() => pool.end());

test('no words: zeros, the goal is 100', async () => {
  expect(await get<Progress>('/v1/progress')).toEqual({ total: 0, new: 0, learning: 0, mastered: 0, decks: 0, goal: 100, masterBy: '2027-01-03', grid: [], language: '', trees: [], hard: 0, deckWords: [] }); // language and trees added with progress-home; hard and deckWords on 2026-11-23
  expect(await get('/v1/decks')).toEqual({ decks: [] });
});

test('progress counts real words: new, learning, mastered (stage 5 and known), the grid, the date from the pace', async () => {
  const food = await deck('food', 10, 20);
  await deck('draft', 10, 5, 'proposed'); // not made yet: not counted
  const [a, b, c, d] = await cardsOf(food);
  await swipe(a!.id, 'easy'); // stage 2
  await swipe(b!.id, 'hard'); // stage 1, hard
  await swipe(c!.id, 'known');
  await db.execute(sql`update cards set stage = 5, due_at = now() + interval '30 days' where id = ${d!.id}`);
  const p = await get<Progress>('/v1/progress');
  expect(p).toMatchObject({ total: 10, new: 6, learning: 2, mastered: 2, decks: 1, goal: 100 });
  expect(p.grid).toEqual([5, 2, 1, 0, 0, 0, 0, 0, 0]);
  // 3 words started (a, b and the stage 5 one); 3 new words started this week → pace 5; (100 − 3) / 5 = 20 days, + 24
  expect(p.masterBy).toBe('2027-01-03');
});

test('deck list: newest first, with counts and levels; flags on the deck’s cards; other users see nothing', async () => {
  const older = await deck('older', 10, 30);
  const newer = await deck('newer', 3, 10);
  const [x, y, z] = await cardsOf(newer);
  await swipe(x!.id, 'easy');
  await swipe(y!.id, 'hard');
  await swipe(z!.id, 'known');
  const { decks } = await get<{ decks: DeckRow[] }>('/v1/decks');
  expect(decks.map((d) => d.id)).toEqual([newer, older]);
  expect(decks[0]).toMatchObject({ topic: 'newer', words: 3, learning: 2, hard: 1, stages: [5, 2, 1] });
  expect(decks[1]).toMatchObject({ topic: 'older', words: 10, learning: 0, hard: 0 });
  const cards = await cardsOf(newer);
  expect(cards.map((c) => [c.hard ?? false, c.known ?? false])).toEqual([[false, false], [true, false], [false, true]]);
  expect('hard' in cards[0]!).toBe(false);
  await newUser();
  expect(await get('/v1/decks')).toEqual({ decks: [] });
});

test('restore: a known word is back in the round; a word that is not known is refused; another user gets 404', async () => {
  const food = await deck('food', 2, 10);
  const [a, b] = await cardsOf(food);
  await swipe(a!.id, 'easy');
  now = new Date('2026-11-23T10:00:00Z');
  await swipe(a!.id, 'known'); // a stage 2 word, marked "I know it"
  await swipe(b!.id, 'known'); // a new word, marked "I know it"
  expect((await get<{ cards: Card[] }>('/v1/review')).cards).toEqual([]);
  const restored = await call(`/v1/cards/${a!.id}/restore`, 'POST');
  expect(restored.status).toBe(200);
  expect(await restored.json()).toEqual({ id: a!.id, stage: 2, known: false });
  await call(`/v1/cards/${b!.id}/restore`, 'POST');
  expect((await get<{ cards: Card[] }>('/v1/review')).cards.map((c) => c.id)).toEqual([a!.id, b!.id]); // due first, then new
  const again = await call(`/v1/cards/${a!.id}/restore`, 'POST');
  expect(again.status).toBe(409);
  expect(await again.json()).toEqual({ error: 'not_known' });
  const owner = call;
  await newUser();
  expect((await call(`/v1/cards/${a!.id}/restore`, 'POST')).status).toBe(404);
  call = owner;
});

test('a round for one deck: only its cards, with the same daily limit', async () => {
  await deck('first', 15, 30);
  const second = await deck('second', 10, 10);
  expect((await get<{ cards: Card[] }>(`/v1/review?deckId=${second}`)).cards.map((c) => c.word)).toEqual(Array.from({ length: 10 }, (_, i) => `second-${i}`));
  const all = (await get<{ cards: Card[] }>('/v1/review')).cards; // 20 new: 15 of the first deck + 5 of the second
  for (const c of all) await swipe(c.id, 'easy');
  expect((await get<{ cards: Card[] }>(`/v1/review?deckId=${second}`)).cards).toEqual([]); // 20 new words today already
  expect((await get<{ cards: Card[] }>('/v1/review?deckId=not-a-deck')).cards).toEqual([]);
  expect((await get<{ cards: Card[] }>(`/v1/review?deckId=${crypto.randomUUID()}`)).cards).toEqual([]);
});

test('language from the profile, and one tree per deck (oldest first) with the levels of its met words', async () => {
  await db.execute(sql`insert into profiles (user_id, learning_language, native_language, level, goal, interests) values (${userId}, 'es', 'en', 'beginner', 'travel', '{}')`);
  const older = await deck('older', 10, 30);
  await deck('newer', 5, 10);
  const [a, b, c] = await cardsOf(older);
  await swipe(a!.id, 'easy'); // stage 2
  await swipe(b!.id, 'known'); // counts as 5
  await db.execute(sql`update cards set stage = 5 where id = ${c!.id}`);
  const p = await get<Progress & { language: string; trees: number[][] }>('/v1/progress');
  expect(p.language).toBe('Spanish');
  expect(p.trees).toEqual([[5, 5, 2], []]);
});
