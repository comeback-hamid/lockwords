import { beforeAll, expect, test } from 'vitest';

import { createApp, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

let token: string;
const saved = new Map<string, unknown>();
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const profiles: ProfilesStore = { upsert: async (userId, p) => (saved.set(userId, p), p), get: async () => null, setChat: async () => false };
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const t = await makeTestKeys();
  token = await t.token();
  app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles });
});
const call = (path: string, init: RequestInit = {}, auth = true) =>
  app.request(path, { ...init, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) } });

// The word test and the estimate are tested in word-test.test.ts (vocab engine, 2026-11-17).

const good = {
  learningLanguage: 'es',
  nativeLanguage: 'en',
  level: 'some_basics',
  knownWords: 1850,
  cefr: 'A2',
  goal: 'travel',
  goalOther: null,
  interests: ['food', 'music'],
};
const put = (body: unknown, auth = true) => call('/v1/profile', { method: 'PUT', body: JSON.stringify(body) }, auth);

test('PUT /v1/profile saves and returns the profile', async () => {
  const res = await put(good);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual(good);
  expect([...saved.values()]).toEqual([good]);
});

test('PUT /v1/profile refuses a bad body and saves nothing', async () => {
  saved.clear();
  for (const bad of [
    { ...good, level: 'expert' },
    { ...good, interests: [] },
    { ...good, interests: ['food', 'knitting'] },
    { ...good, interests: ['food', 'food'] },
    { ...good, learningLanguage: '' },
    { ...good, knownWords: 6000 },
    { ...good, goalOther: 'x'.repeat(81) },
  ]) {
    expect((await put(bad)).status).toBe(400);
  }
  expect(saved.size).toBe(0);
});

test('PUT /v1/profile without a token → 401', async () => {
  expect((await put(good, false)).status).toBe(401);
});
