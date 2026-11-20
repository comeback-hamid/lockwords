import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { createPlanStore } from '../../src/db/plans.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createProgressStore } from '../../src/db/progress.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { fixtureDeckPlanner } from '../../src/llm/fixture.js';
import type { DeckPlanner } from '../../src/llm/plan-decks.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const plan = vi.fn<DeckPlanner['plan']>((i) => fixtureDeckPlanner.plan(i));
const userId = crypto.randomUUID();
let call: (path: string, method?: string, body?: unknown) => Promise<Response>;
const topics = async () => ((await (await call('/v1/plan')).json()) as { goal: string; items: { topic: string }[] }).items.map((i) => i.topic);

beforeAll(async () => {
  const t = await makeTestKeys();
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), profiles: createProfilesStore(db), progress: createProgressStore(db), plans: createPlanStore(db), deckPlanner: { plan } });
  const headers = { Authorization: `Bearer ${await t.token({ sub: userId })}`, 'Content-Type': 'application/json' };
  call = (path, method = 'GET', body) => Promise.resolve(app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
});
afterAll(() => pool.end());

test('the plan is kept in the database, read again without the AI, and made again when a deck takes one idea', async () => {
  expect(await topics()).toEqual([]); // no profile yet
  await call('/v1/profile', 'PUT', { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: null, cefr: null, goal: 'travel', goalOther: null, interests: ['food'] });
  expect(await topics()).toEqual(['Ordering food', 'Getting around the city', 'Meeting new people']);
  expect((await db.execute(sql`select jsonb_array_length(items) as n from deck_plans where user_id = ${userId}`)).rows[0]).toEqual({ n: 3 });
  await topics();
  expect(plan).toHaveBeenCalledTimes(1);
  // The learner now has a deck about the first idea.
  await db.execute(sql`insert into decks (user_id, topic, title, reason, cefr, status) values (${userId}, 'Ordering food', 't', 'r', 'A1', 'ready')`);
  expect(await topics()).toEqual(['Getting around the city', 'Meeting new people', 'At the hotel']);
  expect(plan).toHaveBeenCalledTimes(2);
});
