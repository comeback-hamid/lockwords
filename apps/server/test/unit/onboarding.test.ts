import { beforeAll, expect, test } from 'vitest';

import { createApp, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { cefrFor, estimate, wordTestFor } from '../../src/onboarding/word-test.js';
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

const es = wordTestFor('es')!;
const all = es.flatMap((b) => b.words);

test('Spanish has three bands of 20–25 different words', async () => {
  const res = await call('/v1/word-test?language=es');
  expect(res.status).toBe(200);
  const body = (await res.json()) as { supported: boolean; bands: { level: string; words: string[] }[] };
  expect(body.supported).toBe(true);
  expect(body.bands.map((b) => b.level)).toEqual(['basic', 'intermediate', 'advanced']);
  for (const b of body.bands) {
    expect(b.words.length).toBeGreaterThanOrEqual(20);
    expect(b.words.length).toBeLessThanOrEqual(25);
  }
  expect(new Set(all).size).toBe(all.length);
});

test('"Spanish" by name works too; a language with no test is not supported', async () => {
  expect(((await (await call('/v1/word-test?language=Spanish')).json()) as { supported: boolean }).supported).toBe(true);
  expect(await (await call('/v1/word-test?language=Swedish')).json()).toEqual({ supported: false, bands: [] });
});

test('missing language → 400', async () => {
  expect((await call('/v1/word-test')).status).toBe(400);
  expect((await call('/v1/word-test?language=')).status).toBe(400);
});

test('estimate rule', () => {
  expect(estimate(es, [])).toEqual({ knownWords: 0, outOf: 5000, cefr: 'A1' });
  expect(estimate(es, all)).toEqual({ knownWords: 5000, outOf: 5000, cefr: 'C1' });
  expect(estimate(es, es[0]!.words)).toEqual({ knownWords: 1000, outOf: 5000, cefr: 'A2+' });
  expect(estimate(es, ['not-a-test-word']).knownWords).toBe(0);
  expect(estimate(es, [...es[0]!.words, ...es[0]!.words]).knownWords).toBe(1000); // doubles do not count twice
  expect(estimate(es, es[1]!.words.slice(0, 7)).knownWords % 50).toBe(0);
});

test('CEFR label edges', () => {
  expect([450, 500, 1000, 2000, 3000, 4000].map(cefrFor)).toEqual(['A1', 'A2', 'A2+', 'B1', 'B2', 'C1']);
});

test('POST /v1/word-test/estimate', async () => {
  const res = await call('/v1/word-test/estimate', { method: 'POST', body: JSON.stringify({ language: 'es', known: es[0]!.words }) });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ knownWords: 1000, outOf: 5000, cefr: 'A2+' });
  const none = await call('/v1/word-test/estimate', { method: 'POST', body: JSON.stringify({ language: 'Swedish', known: [] }) });
  expect(none.status).toBe(400);
});

const good = {
  learningLanguage: 'es',
  nativeLanguage: 'en',
  level: 'some_basics',
  knownWords: 1850,
  cefr: 'A2+',
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
