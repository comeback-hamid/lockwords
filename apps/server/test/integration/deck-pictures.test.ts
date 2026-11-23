import { sql } from 'drizzle-orm';
import { PgBoss } from 'pg-boss';
import sharp from 'sharp';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createPicturesStore } from '../../src/db/pictures.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createQueuedDeckJobs } from '../../src/decks/queued-jobs.js';
import { loadEnv } from '../../src/env.js';
import { fixtureSheetMaker, type SheetMaker } from '../../src/llm/deck-pictures.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';

// Deck pictures on the real database and the real queue. The image model is the stand-in sheet.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const boss = new PgBoss(env.DATABASE_URL);
const decks = createDecksStore(db);
const pictures = createPicturesStore(db);
const userId = crypto.randomUUID();
let sheetMaker: SheetMaker = fixtureSheetMaker();
let jobs: Awaited<ReturnType<typeof createQueuedDeckJobs>>;

beforeAll(async () => {
  await db.execute(sql`insert into users (id, is_guest) values (${userId}, true)`);
  await boss.start();
  jobs = await createQueuedDeckJobs(boss, db, { profiles: createProfilesStore(db), decks, deckMaker: fixtureDeckMaker, pictures, sheetMaker: { sheet: (i, g) => sheetMaker.sheet(i, g) } });
}, 30_000);
afterAll(async () => {
  await boss.stop();
  await pool.end();
});

const newDeck = () => decks.create(userId, { topic: 'Ordering food', title: 'Order food.', titleTranslation: 'غذا سفارش بده.', reason: 'r', cefr: 'A1' });
const until = async (id: string, pictureStatus: string) => {
  for (let i = 0; i < 150; i++) {
    const deck = await decks.get(userId, id);
    if (deck?.picturesStatus === pictureStatus) return deck;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`the deck's pictures never became ${pictureStatus}`);
};

test('a new deck keeps its title translation and has no pictures yet', async () => {
  const deck = await newDeck();
  expect(deck).toMatchObject({ titleTranslation: 'غذا سفارش بده.', picturesStatus: 'none', picturesReady: 0 });
});

test('the job makes the words, then a picture for every card; each card has its own picture address', async () => {
  const { id } = await newDeck();
  await jobs.start(userId, id);
  const deck = await until(id, 'ready');
  expect(deck.status).toBe('ready');
  expect(deck.picturesReady).toBe(10);
  const paths = deck.cards.map((c) => c.imageUrl);
  expect(new Set(paths).size).toBe(10);
  for (const p of paths) expect(p).toMatch(/^\/pictures\/[0-9a-f-]{36}$/);
  const data = await pictures.read(paths[0]!.replace('/pictures/', ''));
  expect((await sharp(data!).metadata()).format).toBe('webp');
  expect(await pictures.todo(id)).toEqual([]);
  // The review round carries the picture too.
  const round = await createCardsStore(db).round(userId, new Date());
  expect(round.find((c) => c.id === deck.cards[0]!.id)?.imageUrl).toBe(paths[0]);
}, 60_000);

test('the image model is down: the deck is ready with its 10 words, no pictures, status failed', async () => {
  sheetMaker = { sheet: async () => Promise.reject(new Error('down')) };
  const { id } = await newDeck();
  await jobs.start(userId, id);
  const deck = await until(id, 'failed');
  expect(deck.status).toBe('ready');
  expect(deck.cards).toHaveLength(10);
  expect(deck.picturesReady).toBe(0);
  expect(deck.cards.every((c) => c.imageUrl == null)).toBe(true);
  sheetMaker = fixtureSheetMaker();
}, 60_000);
