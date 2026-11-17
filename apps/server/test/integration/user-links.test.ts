import { sql } from 'drizzle-orm';
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
  t = await makeTestKeys();
  app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), profiles: createProfilesStore(db) });
});
afterAll(() => pool.end());

const profile = { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: null, cefr: null, goal: 'travel', goalOther: null, interests: ['food'] };

test('saving a profile before /v1/me makes the user row too', async () => {
  const sub = crypto.randomUUID();
  const headers = { Authorization: `Bearer ${await t.token({ sub })}`, 'Content-Type': 'application/json' };
  expect((await app.request('/v1/profile', { method: 'PUT', headers, body: JSON.stringify(profile) })).status).toBe(200);
  expect((await db.execute(sql`select is_guest from users where id = ${sub}`)).rows).toEqual([{ is_guest: true }]);
});

test('the database refuses a profile or a deck for a user that does not exist', async () => {
  const nobody = crypto.randomUUID();
  await expect(
    db.execute(sql`insert into profiles (user_id, learning_language, native_language, level, goal, interests) values (${nobody}, 'es', 'en', 'beginner', 'travel', '{}')`),
  ).rejects.toThrow();
  await expect(
    db.execute(sql`insert into decks (user_id, topic, title, reason, cefr) values (${nobody}, 't', 't', 'r', 'A1')`),
  ).rejects.toThrow();
});
