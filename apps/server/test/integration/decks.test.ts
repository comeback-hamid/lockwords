import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let call: (sub: string) => Promise<(path: string, method?: string, body?: unknown) => Promise<Response>>;

beforeAll(async () => {
  const t = await makeTestKeys();
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), profiles: createProfilesStore(db), decks: createDecksStore(db), deckMaker: fixtureDeckMaker });
  call = async (sub) => {
    const headers = { Authorization: `Bearer ${await t.token({ sub })}`, 'Content-Type': 'application/json' };
    return async (path, method = 'GET', body) => app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
});
afterAll(() => pool.end());

test('profile → chat name → propose → generate twice → read; another user cannot see it', async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] });
  expect((await me('/v1/profile/chat', 'PUT', { name: 'Maya', chatLanguage: 'target' })).status).toBe(200);
  expect((await db.execute(sql`select name, chat_language from profiles where user_id = ${sub}`)).rows).toEqual([{ name: 'Maya', chat_language: 'target' }]);
  // Saving the profile again (a user who restarts onboarding) keeps the name.
  await me('/v1/profile', 'PUT', { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] });
  expect((await db.execute(sql`select name from profiles where user_id = ${sub}`)).rows).toEqual([{ name: 'Maya' }]);

  const proposed = (await (await me('/v1/decks', 'POST', { topic: 'Ordering food' })).json()) as { id: string; cefr: string };
  expect(proposed.cefr).toBe('A2');
  const ready = (await (await me(`/v1/decks/${proposed.id}/generate`, 'POST')).json()) as { status: string; cards: { id: string; position: number }[] };
  expect(ready.status).toBe('ready');
  expect(ready.cards.map((c) => c.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  await me(`/v1/decks/${proposed.id}/generate`, 'POST');
  expect(Number((await db.execute(sql`select count(*) as n from cards where deck_id = ${proposed.id}`)).rows[0]?.n)).toBe(10);
  expect(await (await me(`/v1/decks/${proposed.id}`)).json()).toEqual(ready);

  const stranger = await call(crypto.randomUUID());
  expect((await stranger(`/v1/decks/${proposed.id}`)).status).toBe(404);
});
