import { sql } from 'drizzle-orm';
import { PgBoss } from 'pg-boss';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createQueuedDeckJobs } from '../../src/decks/queued-jobs.js';
import { loadEnv } from '../../src/env.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import type { DeckMaker } from '../../src/llm/make-deck.js';

// The real queue (pg-boss) on the test database.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const boss = new PgBoss(env.DATABASE_URL);
const decks = createDecksStore(db);
const userId = crypto.randomUUID();
let maker: DeckMaker = fixtureDeckMaker;
let jobs: Awaited<ReturnType<typeof createQueuedDeckJobs>>;

beforeAll(async () => {
  await db.execute(sql`insert into users (id, is_guest) values (${userId}, true)`);
  await boss.start();
  // The maker is read on every job, so a test can swap it.
  jobs = await createQueuedDeckJobs(boss, db, { profiles: createProfilesStore(db), decks, deckMaker: { propose: (i) => maker.propose(i), cards: (i) => maker.cards(i) } });
}, 30_000);
afterAll(async () => {
  await boss.stop();
  await pool.end();
});

const newDeck = () => decks.create(userId, { topic: 'Ordering food', title: 't', reason: 'r', cefr: 'A1' });
const until = async (id: string, status: string) => {
  for (let i = 0; i < 100; i++) {
    const deck = await decks.get(userId, id);
    if (deck?.status === status) return deck;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`the deck never became ${status}`);
};

test('start marks the deck as generating, the worker makes it ready with 10 words; starting twice makes one set of words', async () => {
  const { id } = await newDeck();
  expect(await jobs.start(userId, id)).toBe('queued');
  expect(await jobs.start(userId, id)).toBe('queued');
  expect(['generating', 'ready']).toContain((await decks.get(userId, id))!.status);
  expect((await until(id, 'ready')).cards).toHaveLength(10);
}, 30_000);

test('a failed AI call puts the deck back to proposed with no words', async () => {
  maker = { ...fixtureDeckMaker, cards: async () => Promise.reject(new Error('model down')) };
  const { id } = await newDeck();
  await jobs.start(userId, id);
  // generating first, then back to proposed
  for (let i = 0; i < 100 && (await db.execute(sql`select 1 from pgboss.job where data->>'deckId' = ${id} and state in ('completed', 'failed')`)).rowCount === 0; i++) await new Promise((r) => setTimeout(r, 200));
  expect(await decks.get(userId, id)).toMatchObject({ status: 'proposed', cards: [] });
  maker = fixtureDeckMaker;
}, 30_000);
