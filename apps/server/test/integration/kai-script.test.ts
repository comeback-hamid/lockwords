import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { createKaiScriptStore } from '../../src/db/kai-scripts.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { ENGLISH_SCRIPT, SCRIPT_KEYS } from '../../src/kai/script.js';
import type { ScriptTranslator } from '../../src/llm/translate-script.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const language = `testish-${crypto.randomUUID().slice(0, 8)}`; // a language no other run has kept
const translated = Object.fromEntries(SCRIPT_KEYS.map((k) => [k, `T ${ENGLISH_SCRIPT[k]}`]));
const translate = vi.fn<ScriptTranslator['translate']>(async () => ({ ...translated, extra: 'not one of our keys' }));
let call: (query: string) => Promise<Response>;

beforeAll(async () => {
  const t = await makeTestKeys();
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), kaiScripts: createKaiScriptStore(db), scriptTranslator: { translate } });
  const headers = { Authorization: `Bearer ${await t.token()}` };
  call = (query) => Promise.resolve(app.request(`/v1/kai/script?${query}`, { headers }));
});
afterAll(async () => {
  await db.execute(sql`delete from kai_scripts where language = ${language}`);
  await pool.end();
});

test('a language is translated once, kept with only our keys, and read from the database after that', async () => {
  const first = (await (await call(`native=${language}&learning=en`)).json()) as { native: Record<string, string> };
  expect(first.native).toEqual(translated);
  const kept = (await db.execute(sql`select lines from kai_scripts where language = ${language}`)).rows[0]!.lines as Record<string, string>;
  expect(kept).toEqual(translated);
  expect(Object.keys(kept)).not.toContain('extra');
  const second = (await (await call(`native=en&learning=${language.toUpperCase()}`)).json()) as { learning: Record<string, string> };
  expect(second.learning).toEqual(translated);
  expect(translate).toHaveBeenCalledTimes(1);
});
