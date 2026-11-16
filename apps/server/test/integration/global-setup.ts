import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { createDb } from '../../src/db/client.js';
import { loadEnv } from '../../src/env.js';

export default async function setup() {
  const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
  const { db, pool } = createDb(env.DATABASE_URL);
  await migrate(db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname });
  await pool.end();
}
