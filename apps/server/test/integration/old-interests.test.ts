import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createDb } from '../../src/db/client.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);

beforeAll(() => migrate(db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname }));
afterAll(() => pool.end());

test('a row saved with old interests reads clean, and the row is not changed', async () => {
  const id = crypto.randomUUID();
  await createUsersStore(db).upsert(id, true);
  await db.execute(sql`insert into profiles (user_id, learning_language, native_language, level, goal, interests)
    values (${id}, 'es', 'en', 'beginner', 'travel', ${sql.raw("ARRAY['cooking','fashion','music']")})`);
  const profile = await createProfilesStore(db).get(id);
  expect(profile?.interests).toEqual(['food', 'music']);
  const rows = (await db.execute(sql`select interests from profiles where user_id = ${id}`)).rows;
  expect(rows).toEqual([{ interests: ['cooking', 'fashion', 'music'] }]);
});
