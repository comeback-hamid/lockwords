import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createDb } from '../../src/db/client.js';
import { createKaiStore } from '../../src/db/kai.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { kaiMessages } from '../../src/db/schema.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { fixtureKaiChat } from '../../src/llm/kai-chat.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// Change new-words-polish: paging through a long chat on the real database.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let call: (sub: string) => Promise<(path: string, method?: string, body?: unknown) => Promise<Response>>;

beforeAll(async () => {
  const t = await makeTestKeys();
  call = async (sub) => {
    const headers = { Authorization: `Bearer ${await t.token({ sub })}`, 'Content-Type': 'application/json' };
    return async (path, method = 'GET', body) =>
      createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), profiles: createProfilesStore(db), kai: createKaiStore(db), kaiChat: fixtureKaiChat }).request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
});
afterAll(() => pool.end());

type Chat = { messages: { id: string; text: string }[]; options: string[]; hasMore?: boolean };
const profile = { learningLanguage: 'Spanish', nativeLanguage: 'English', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] };
// 60 turns of two lines each: a user line and Kai's answer share one time and differ by `position`, as real turns do.
const fill = (userId: string, turns: number) =>
  db.insert(kaiMessages).values(
    Array.from({ length: turns }, (_, i) => {
      const createdAt = new Date(Date.UTC(2026, 10, 17, 10, 0, i));
      return [
        { userId, role: 'user', text: `m${2 * i + 1}`, position: 0, createdAt },
        { userId, role: 'kai', text: `m${2 * i + 2}`, translation: 'x', options: ['Sí'], position: 1, createdAt },
      ];
    }).flat(),
  );
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `m${from + i}`);

test('120 messages: three pages, each oldest first, nothing twice and nothing lost; private', async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profile);
  await fill(sub, 60);
  const read = async (before?: string) => (await (await me(`/v1/kai/chat${before ? `?before=${before}` : ''}`)).json()) as Chat;

  const newest = await read();
  expect(newest.messages.map((m) => m.text)).toEqual(range(71, 120));
  expect(newest.hasMore).toBe(true);
  expect(newest.options).toEqual(['Sí']);

  // The page ends in the middle of a turn (m70 is Kai's line of the turn whose user line is m69).
  const second = await read(newest.messages[0]!.id);
  expect(second.messages.map((m) => m.text)).toEqual(range(21, 70));
  expect(second.hasMore).toBe(true);
  expect(second.options).toEqual([]);

  const first = await read(second.messages[0]!.id);
  expect(first.messages.map((m) => m.text)).toEqual(range(1, 20));
  expect('hasMore' in first).toBe(false);

  const stranger = await call(crypto.randomUUID());
  expect((await stranger(`/v1/kai/chat?before=${newest.messages[0]!.id}`)).status).toBe(404);
  expect((await me('/v1/kai/chat?before=nope')).status).toBe(404);
  expect(Number((await db.execute(sql`select count(*) as n from kai_messages where user_id = ${sub}`)).rows[0]?.n)).toBe(120);
});
