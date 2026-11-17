import { beforeAll, expect, test } from 'vitest';

import { createApp, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { INTERESTS, readInterests } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const TWENTY = [
  'food', 'travel', 'work', 'business', 'tech', 'science', 'music', 'movies', 'books', 'sports',
  'health', 'nature', 'animals', 'art', 'news', 'family', 'friends_dating', 'shopping', 'money', 'culture',
];

let token: string;
const saved: unknown[] = [];
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const profiles: ProfilesStore = { upsert: async (_id, p) => (saved.push(p), p), get: async () => null, setChat: async () => false };
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const t = await makeTestKeys();
  token = await t.token();
  app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles });
});
const good = { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: null, cefr: null, goal: 'travel', goalOther: null, interests: ['food'] };
const put = (interests: string[]) =>
  app.request('/v1/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...good, interests }) });

test('the list is these 20', () => {
  expect([...INTERESTS]).toEqual(TWENTY);
});

test('every one of the 20 is taken; 5 at once is taken', async () => {
  for (const i of TWENTY) expect((await put([i])).status).toBe(200);
  expect((await put(TWENTY.slice(0, 5))).status).toBe(200);
});

test('6 interests or a dropped one → 400, nothing saved', async () => {
  saved.length = 0;
  expect((await put(TWENTY.slice(0, 6))).status).toBe(400);
  for (const old of ['cooking', 'fitness', 'fashion', 'gaming']) expect((await put(['food', old])).status).toBe(400);
  expect(saved).toEqual([]);
});

test('old saved interests read clean', () => {
  expect(readInterests(['cooking', 'fashion', 'music'])).toEqual(['food', 'music']);
  expect(readInterests(['food', 'cooking', 'fitness', 'health'])).toEqual(['food', 'health']);
  expect(readInterests(['fashion', 'gaming'])).toEqual([]);
  expect(readInterests(['knitting', 'news'])).toEqual(['news']);
  expect(readInterests(TWENTY.slice(0, 7))).toEqual(TWENTY.slice(0, 7)); // old rows over 5 are kept
});
