import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  await migrate(db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname });
  t = await makeTestKeys();
  app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), profiles: createProfilesStore(db) });
});
afterAll(() => pool.end());

const body = {
  learningLanguage: 'es',
  nativeLanguage: 'en',
  level: 'beginner',
  knownWords: null,
  cefr: null,
  goal: 'other',
  goalOther: 'For my grandmother',
  interests: ['family', 'food'],
};

test('saving twice leaves one row with the new values, even before /v1/me was ever called', async () => {
  const sub = crypto.randomUUID();
  const headers = { Authorization: `Bearer ${await t.token({ sub })}`, 'Content-Type': 'application/json' };
  const put = (b: unknown) => app.request('/v1/profile', { method: 'PUT', headers, body: JSON.stringify(b) });
  expect((await put(body)).status).toBe(200);
  const second = await put({ ...body, level: 'advanced', interests: ['news'] });
  expect(await second.json()).toEqual({ ...body, level: 'advanced', interests: ['news'] });
  const rows = (await db.execute(sql`select level, interests from profiles where user_id = ${sub}`)).rows;
  expect(rows).toEqual([{ level: 'advanced', interests: ['news'] }]);
});
