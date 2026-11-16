import { sql } from 'drizzle-orm';
import { afterAll, expect, test } from 'vitest';

import { createDb } from '../../src/db/client.js';
import { loadEnv } from '../../src/env.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
afterAll(() => pool.end());

test('connects to the test database', async () => {
  const res = await db.execute(sql`select current_database() as name`);
  expect(String(res.rows[0]?.name)).toContain('test');
});
