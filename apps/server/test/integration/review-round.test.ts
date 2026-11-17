import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { loadEnv } from '../../src/env.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const cards = createCardsStore(db);
const userId = crypto.randomUUID();

// Three decks of 10 new words, made one minute apart. `ready` is false for the last one.
beforeAll(async () => {
  await db.execute(sql`insert into users (id, is_guest) values (${userId}, true)`);
  for (const [i, status] of (['ready', 'ready', 'ready', 'proposed'] as const).entries()) {
    const id = crypto.randomUUID();
    await db.execute(sql`insert into decks (id, user_id, topic, title, reason, cefr, status, created_at) values (${id}, ${userId}, ${`deck-${i}`}, 't', 'r', 'A1', ${status}, now() - make_interval(mins => ${10 - i}))`);
    for (let p = 0; p < 10; p++) {
      await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) values (${id}, ${p}, ${`d${i}-w${p}`}, 't', 'e', 'et')`);
    }
  }
});
afterAll(() => pool.end());

test('the round holds the first 20 new words (oldest deck first), with due words in front; known, later and unmade words stay out', async () => {
  const first = await cards.round(userId, new Date());
  expect(first.map((c) => c.word)).toEqual([...Array.from({ length: 10 }, (_, p) => `d0-w${p}`), ...Array.from({ length: 10 }, (_, p) => `d1-w${p}`)]);

  await db.execute(sql`update cards set stage = 2, due_at = now() - interval '1 hour' where word = 'd2-w9' and deck_id in (select id from decks where user_id = ${userId})`);
  await db.execute(sql`update cards set stage = 1, due_at = now() + interval '1 day' where word = 'd0-w0' and deck_id in (select id from decks where user_id = ${userId})`);
  await db.execute(sql`update cards set known = true where word = 'd0-w1' and deck_id in (select id from decks where user_id = ${userId})`);
  const second = (await cards.round(userId, new Date())).map((c) => c.word);
  expect(second).toHaveLength(21);
  expect(second.slice(0, 2)).toEqual(['d2-w9', 'd0-w2']);
  expect(second.at(-1)).toBe('d2-w1'); // 8 left in deck 0, 10 in deck 1, then 2 from deck 2
  expect(second.join()).not.toMatch(/d0-w0|d0-w1,|d3-/);
});
