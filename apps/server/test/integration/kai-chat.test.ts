import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createKaiStore } from '../../src/db/kai.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { fixtureKaiChat, type KaiChat, type KaiContext } from '../../src/llm/kai-chat.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const kai = createKaiStore(db);
let now = new Date('2026-11-17T10:00:00Z');
let seen: KaiContext[] = [];
let kaiChat: KaiChat = { answer: async (c) => (seen.push(c), fixtureKaiChat.answer(c)) };
type Call = (path: string, method?: string, body?: unknown) => Promise<Response>;
let call: (sub: string) => Promise<Call>;

beforeAll(async () => {
  const t = await makeTestKeys();
  call = async (sub) => {
    const headers = { Authorization: `Bearer ${await t.token({ sub })}`, 'Content-Type': 'application/json' };
    return async (path, method = 'GET', body) =>
      createApp({
        keys: t.keys,
        issuer: ISSUER,
        users: createUsersStore(db),
        profiles: createProfilesStore(db),
        decks: createDecksStore(db),
        deckMaker: fixtureDeckMaker,
        cards: createCardsStore(db),
        kai,
        kaiChat: { answer: (c) => kaiChat.answer(c) },
        kaiNow: () => now,
      }).request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
});
afterAll(() => pool.end());

const profileOf = (cefr: string) => ({ learningLanguage: 'Spanish', nativeLanguage: 'English', level: 'beginner', knownWords: 600, cefr, goal: 'travel', goalOther: null, interests: ['food'] });
type Chat = { messages: { id: string; from: string; text: string; translation: string | null }[]; options: string[]; translationOn: boolean };
type Turn = { userMessage: { text: string } | null; messages: { text: string }[]; options: string[]; action: string | null };
const json = async <T>(r: Promise<Response>) => (await (await r).json()) as T;

test('open → message → restart: the history is saved in order, with options, and is private', async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profileOf('A2'));
  await me('/v1/profile/chat', 'PUT', { name: 'Maya', chatLanguage: 'target' });

  expect(await json<Chat>(me('/v1/kai/chat'))).toEqual({ messages: [], options: [], translationOn: true, nativeLanguage: 'English' });
  seen = [];
  const opening = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { open: true }));
  expect(opening.messages[0]!.text).toContain('Maya');
  expect(seen[0]).toMatchObject({ name: 'Maya', firstVisit: true, opening: true });
  // Same day: Kai adds nothing.
  expect((await json<Turn>(me('/v1/kai/chat/turns', 'POST', { open: true }))).messages).toEqual([]);

  now = new Date(now.getTime() + 1000);
  const turn = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'I work in a café' }));
  expect(turn.userMessage!.text).toBe('I work in a café');

  const chat = await json<Chat>(me('/v1/kai/chat'));
  expect(chat.messages.map((m) => m.from)).toEqual([...opening.messages.map(() => 'kai'), 'user', ...turn.messages.map(() => 'kai')]);
  expect(chat.messages.map((m) => m.text)).toEqual([...opening.messages.map((m) => m.text), 'I work in a café', ...turn.messages.map((m) => m.text)]);
  expect(chat.options).toEqual(turn.options);
  expect(await json<Chat>(me('/v1/kai/chat'))).toEqual(chat);
  // The fixture saved a note about the learner; the next turn gets it.
  expect((await db.execute(sql`select text from kai_notes where user_id = ${sub}`)).rows).toEqual([{ text: 'Said: I work in a café' }]);
  seen = [];
  now = new Date(now.getTime() + 1000);
  await me('/v1/kai/chat/turns', 'POST', { text: 'Hola' });
  expect(seen[0]!.notes).toEqual(['Said: I work in a café']);
  expect(seen[0]!.history.at(-1)).toMatchObject({ from: 'kai' });

  const stranger = await call(crypto.randomUUID());
  expect((await json<Chat>(stranger('/v1/kai/chat'))).messages).toEqual([]);
});

test('the next opening comes after 12 hours and is not a first visit', async () => {
  const me = await call(crypto.randomUUID());
  await me('/v1/profile', 'PUT', profileOf('B1'));
  now = new Date('2026-11-18T08:00:00Z');
  await me('/v1/kai/chat/turns', 'POST', { open: true });
  now = new Date('2026-11-18T21:00:00Z');
  seen = [];
  const next = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { open: true }));
  expect(next.messages.length).toBeGreaterThan(0);
  expect(seen[0]).toMatchObject({ opening: true, firstVisit: false });
});

test('a failed AI call saves nothing; no profile is 409', async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  expect((await me('/v1/kai/chat/turns', 'POST', { text: 'Hola' })).status).toBe(409);
  await me('/v1/profile', 'PUT', profileOf('A1'));
  const good = kaiChat;
  kaiChat = { answer: async () => Promise.reject(new Error('down')) };
  expect((await me('/v1/kai/chat/turns', 'POST', { text: 'Hola' })).status).toBe(502);
  kaiChat = good;
  expect((await json<Chat>(me('/v1/kai/chat'))).messages).toEqual([]);
  expect(Number((await db.execute(sql`select count(*) as n from kai_messages where user_id = ${sub}`)).rows[0]?.n)).toBe(0);
});

test('notes: no copies, and only the newest 50 are kept', async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profileOf('A2'));
  const good = kaiChat;
  let n = 0;
  kaiChat = { answer: async () => ({ lines: [{ text: 'ok', translation: 'ok' }], remember: [`note ${n++}`, 'always the same'] }) };
  for (let i = 0; i < 52; i++) {
    now = new Date(now.getTime() + 1000);
    expect((await me('/v1/kai/chat/turns', 'POST', { text: `m${i}` })).status).toBe(200);
  }
  kaiChat = good;
  const notes = await kai.notes(sub);
  expect(notes).toHaveLength(50);
  expect(notes.filter((t) => t === 'always the same').length).toBeLessThanOrEqual(1);
  // A note that was dropped as the oldest and is said again comes back as a new one, so it may be the last.
  expect(notes).toContain('note 51');
  expect(notes).not.toContain('note 0');
});

test('daily limit: 200 messages in 24 hours, then 429 and nothing saved', async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profileOf('A2'));
  now = new Date('2026-12-01T10:00:00Z');
  await db.execute(sql`insert into kai_messages (user_id, role, text, created_at) select ${sub}::uuid, 'user', 'x', ${new Date(now.getTime() - 60_000).toISOString()}::timestamptz from generate_series(1, 200)`);
  expect((await me('/v1/kai/chat/turns', 'POST', { text: 'one more' })).status).toBe(429);
  expect(Number((await db.execute(sql`select count(*) as n from kai_messages where user_id = ${sub}`)).rows[0]?.n)).toBe(200);
});

test('translation: default by level, then the saved choice', async () => {
  const a2 = await call(crypto.randomUUID());
  const b1 = await call(crypto.randomUUID());
  await a2('/v1/profile', 'PUT', profileOf('A2'));
  await b1('/v1/profile', 'PUT', profileOf('B1'));
  expect((await json<Chat>(a2('/v1/kai/chat'))).translationOn).toBe(true);
  expect((await json<Chat>(b1('/v1/kai/chat'))).translationOn).toBe(false);
  expect((await a2('/v1/kai/chat/translation', 'PUT', { on: false })).status).toBe(200);
  expect((await json<Chat>(a2('/v1/kai/chat'))).translationOn).toBe(false);
  // Saving the profile again keeps the choice.
  await a2('/v1/profile', 'PUT', profileOf('A2'));
  expect((await json<Chat>(a2('/v1/kai/chat'))).translationOn).toBe(false);
  expect((await (await call(crypto.randomUUID()))('/v1/kai/chat/translation', 'PUT', { on: true })).status).toBe(409);
});

test('word facts: total, reviewed in the last day, due now, hard words first', async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profileOf('A2'));
  const deck = (await json<{ id: string }>(me('/v1/decks', 'POST', { topic: 'Ordering food' }))) as { id: string };
  const ready = await json<{ cards: { id: string; word: string }[] }>(me(`/v1/decks/${deck.id}/generate`, 'POST'));
  now = new Date();
  await me(`/v1/cards/${ready.cards[0]!.id}/swipe`, 'POST', { direction: 'easy' });
  await me(`/v1/cards/${ready.cards[1]!.id}/swipe`, 'POST', { direction: 'hard' });
  // Three days later both swiped cards are due again.
  const later = new Date(Date.now() + 3 * 86_400_000);
  const facts = await kai.facts(sub, later);
  expect(facts.words.total).toBe(10);
  expect(facts.words.dueNow).toBe(2);
  expect(facts.words.reviewedLastDay).toBe(0);
  expect((await kai.facts(sub, new Date(Date.now() + 60_000))).words.reviewedLastDay).toBe(2);
  expect(facts.words.sample).toHaveLength(10);
  expect(facts.words.sample[0]!.word).toBe(ready.cards[1]!.word);
});
