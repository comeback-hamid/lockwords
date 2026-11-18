import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { createUsersStore } from '../../src/db/users.js';
import { createWordTestStore } from '../../src/db/word-tests.js';
import { loadEnv } from '../../src/env.js';
import type { WordPackMaker } from '../../src/llm/word-pack.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let call: (sub: string) => Promise<(path: string, body?: unknown) => Promise<Response>>;
let makerCalls = 0;
const twenty = (p: string) => Array.from({ length: 20 }, (_, i) => `${p}${i}`);
const maker: WordPackMaker = { make: async () => (makerCalls++, { A: twenty('a'), B: twenty('b'), C: twenty('c') }) };

beforeAll(async () => {
  const t = await makeTestKeys();
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), wordTests: createWordTestStore(db), wordPackMaker: maker });
  call = async (sub) => {
    const headers = { Authorization: `Bearer ${await t.token({ sub })}`, 'Content-Type': 'application/json' };
    return async (path, body) => app.request(path, body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) });
  };
});
afterAll(() => pool.end());

test('a finished test saves one row each time, with its ticks', async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  const pages = ((await (await me('/v1/word-test?language=es')).json()) as { pages: Record<string, { w: string }[]> }).pages;
  const A = pages.A!.map((x) => x.w);
  expect((await me('/v1/word-test/estimate', { language: 'es', known: { A, B: [] } })).status).toBe(200);
  await me('/v1/word-test/estimate', { language: 'es', known: { A: [], B: [] } });
  const rows = (await db.execute(sql`select language, version, pages, length(ticks) as n from word_test_results where user_id = ${sub} order by created_at`)).rows;
  expect(rows).toEqual([
    { language: 'es', version: 4, pages: 'AB', n: 51 },
    { language: 'es', version: 4, pages: 'AB', n: 51 },
  ]);
});

test('a typed language pack is made once and kept for everyone', async () => {
  const lang = `Testish ${crypto.randomUUID().slice(0, 8)}`;
  makerCalls = 0;
  const first = (await (await (await call(crypto.randomUUID()))(`/v1/word-test?language=${encodeURIComponent(lang)}`)).json()) as { supported: boolean };
  expect(first.supported).toBe(true);
  await (await call(crypto.randomUUID()))(`/v1/word-test?language=${encodeURIComponent(lang.toUpperCase())}`);
  expect(makerCalls).toBe(1);
  expect((await db.execute(sql`select count(*)::int as n from word_packs where language = ${lang.toLowerCase()}`)).rows).toEqual([{ n: 1 }]);
});
