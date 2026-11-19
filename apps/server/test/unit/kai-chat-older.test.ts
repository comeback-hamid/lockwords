import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { SHOWN_MESSAGES, type KaiMessage, type KaiStore } from '../../src/kai/chat.js';
import { fixtureKaiChat } from '../../src/llm/kai-chat.js';
import type { Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// Change new-words-polish: GET /v1/kai/chat?before=<message id> reads the page before, with fake stores.
const profile: Profile = { learningLanguage: 'Spanish', nativeLanguage: 'English', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: [] };
type Row = KaiMessage & { userId: string };
let rows: Row[];
let ids: { a: string; b: string };
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const profiles: ProfilesStore = { upsert: async (_u, p) => p, get: async () => profile, setChat: async () => true };
const mine = (userId: string) => rows.filter((r) => r.userId === userId);
const store: KaiStore = {
  messages: async (userId, limit) => mine(userId).slice(-limit),
  older: async (userId, before, limit) => {
    const all = mine(userId);
    const at = all.findIndex((r) => r.id === before);
    return at < 0 ? null : all.slice(Math.max(0, at - limit), at);
  },
  lastOpeningAt: async () => null,
  userTurnsSince: async () => 0,
  notes: async () => [],
  facts: async () => ({ name: 'Maya', translationOn: null, words: { total: 0, reviewedLastDay: 0, dueNow: 0, sample: [] } }),
  setTranslation: async () => true,
  addTurn: async () => ({ userMessage: null, messages: [] }),
};
type Chat = { messages: { id: string; text: string }[]; options: string[]; hasMore?: boolean };
let alice: (path: string) => Promise<Response>;
let bob: (path: string) => Promise<Response>;
let t: Awaited<ReturnType<typeof makeTestKeys>>;

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  ids = { a: crypto.randomUUID(), b: crypto.randomUUID() };
  rows = [];
  const as = (token: string) => (path: string) =>
    Promise.resolve(createApp({ keys: t.keys, issuer: ISSUER, users, profiles, kai: store, kaiChat: fixtureKaiChat }).request(path, { headers: { Authorization: `Bearer ${token}` } }));
  alice = as(await t.token({ sub: ids.a }));
  bob = as(await t.token({ sub: ids.b }));
});
// n messages of one user, "m1" the oldest. Every Kai line has options, so we can see when they are left out.
const fill = (userId: string, n: number) => {
  for (let i = 1; i <= n; i++)
    rows.push({ id: crypto.randomUUID(), userId, from: i % 2 ? 'user' : 'kai', text: `m${i}`, translation: null, options: i % 2 ? [] : ['Sí'], opening: false, createdAt: new Date(Date.UTC(2026, 10, 17, 10, 0, i)) });
};
const read = async (call: typeof alice, before?: string) => {
  const res = await call(`/v1/kai/chat${before ? `?before=${before}` : ''}`);
  expect(res.status).toBe(200);
  return (await res.json()) as Chat;
};
const texts = (c: Chat) => c.messages.map((m) => m.text);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `m${from + i}`);

test('a long chat: the newest 50 come back and say that older messages are left', async () => {
  fill(ids.a, 120);
  const chat = await read(alice);
  expect(SHOWN_MESSAGES).toBe(50);
  expect(texts(chat)).toEqual(range(71, 120));
  expect(chat.hasMore).toBe(true);
  expect(chat.options).toEqual(['Sí']);
});

test('a short chat, or exactly 50 messages: `hasMore` is left out', async () => {
  fill(ids.a, 50);
  const chat = await read(alice);
  expect(texts(chat)).toEqual(range(1, 50));
  expect('hasMore' in chat).toBe(false);
});

test('before: the 50 messages before that one, oldest first, no options; the last page has no `hasMore`', async () => {
  fill(ids.a, 120);
  const newest = await read(alice);
  const second = await read(alice, newest.messages[0]!.id);
  expect(texts(second)).toEqual(range(21, 70));
  expect(second.hasMore).toBe(true);
  expect(second.options).toEqual([]);
  const first = await read(alice, second.messages[0]!.id);
  expect(texts(first)).toEqual(range(1, 20));
  expect('hasMore' in first).toBe(false);
  // Before the very first message: nothing, and nothing older.
  const none = await read(alice, first.messages[0]!.id);
  expect(none.messages).toEqual([]);
  expect('hasMore' in none).toBe(false);
});

test('before a message that is not the caller’s, or that is no message id: 404', async () => {
  fill(ids.a, 3);
  const theirs = rows[1]!.id;
  expect((await bob(`/v1/kai/chat?before=${theirs}`)).status).toBe(404);
  expect((await alice(`/v1/kai/chat?before=${crypto.randomUUID()}`)).status).toBe(404);
  const bad = await alice('/v1/kai/chat?before=not-an-id');
  expect(bad.status).toBe(404);
  expect(await bad.json()).toEqual({ error: 'not_found' });
});
