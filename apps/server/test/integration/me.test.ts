import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  await migrate(db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname });
  await db.execute(sql`truncate table users cascade`);
  t = await makeTestKeys();
  app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db) });
});
afterAll(() => pool.end());

const me = (token: string) => app.request('/v1/me', { headers: { Authorization: `Bearer ${token}` } });
const count = async (id: string) => Number((await db.execute(sql`select count(*) as n from users where id = ${id}`)).rows[0]?.n);

test('first call makes the row, second call reuses it', async () => {
  const sub = crypto.randomUUID();
  const token = await t.token({ sub });
  const first = (await (await me(token)).json()) as { createdAt: string };
  expect(await count(sub)).toBe(1);
  const second = (await (await me(token)).json()) as { createdAt: string };
  expect(await count(sub)).toBe(1);
  expect(second.createdAt).toBe(first.createdAt);
});

test('two first calls at once leave one row', async () => {
  const sub = crypto.randomUUID();
  const token = await t.token({ sub });
  const [a, b] = await Promise.all([me(token), me(token)]);
  expect([a.status, b.status]).toEqual([200, 200]);
  expect(await count(sub)).toBe(1);
});
