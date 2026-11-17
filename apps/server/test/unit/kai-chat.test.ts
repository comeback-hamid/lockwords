import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { defaultTranslationOn, nextNotes, OPENING_GAP_MS, type KaiFacts, type KaiMessage, type KaiStore } from '../../src/kai/chat.js';
import { claudeKaiChat } from '../../src/llm/claude.js';
import { buildKaiPrompt, fixtureKaiChat, KaiAnswerSchema, type KaiChat, type KaiContext } from '../../src/llm/kai-chat.js';
import type { Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const line = (text: string, translation = 'x') => ({ text, translation });
const ctx = (over: Partial<KaiContext> = {}): KaiContext => ({
  name: 'Maya',
  learningLanguage: 'Spanish',
  nativeLanguage: 'English',
  cefr: 'A1',
  knownWords: 200,
  goal: 'travel',
  goalOther: null,
  interests: ['food'],
  notes: [],
  history: [],
  words: { total: 0, reviewedLastDay: 0, dueNow: 0, sample: [] },
  opening: true,
  firstVisit: true,
  userText: null,
  ...over,
});

// ---- The answer shape ----
test('answer shape: 1 to 3 lines with text and translation, at most 3 options, defaults', () => {
  const ok = KaiAnswerSchema.parse({ lines: [line('¡Hola!')] });
  expect(ok).toEqual({ lines: [line('¡Hola!')], options: [], remember: [], action: null });
  expect(KaiAnswerSchema.safeParse({ lines: [] }).success).toBe(false);
  expect(KaiAnswerSchema.safeParse({ lines: [1, 2, 3, 4, 5].map((n) => line(`l${n}`)) }).success).toBe(false);
  expect(KaiAnswerSchema.safeParse({ lines: [line('a'.repeat(300))] }).success).toBe(false);
  expect(KaiAnswerSchema.safeParse({ lines: [{ text: 'no translation' }] }).success).toBe(false);
  expect(KaiAnswerSchema.safeParse({ lines: [line('a')], options: ['1', '2', '3', '4'] }).success).toBe(false);
  expect(KaiAnswerSchema.safeParse({ lines: [line('a')], options: ['x'.repeat(31)] }).success).toBe(false);
  expect(KaiAnswerSchema.safeParse({ lines: [line('a')], remember: ['x'.repeat(201)] }).success).toBe(false);
});

test('answer shape: action "review" is kept, any other value is dropped', () => {
  expect(KaiAnswerSchema.parse({ lines: [line('a')], action: 'review' }).action).toBe('review');
  expect(KaiAnswerSchema.parse({ lines: [line('a')], action: 'delete_everything' }).action).toBeNull();
  expect(KaiAnswerSchema.parse({ lines: [line('a')], action: null }).action).toBeNull();
});

// ---- The prompt ----
test('prompt for an A1 first visit carries the level, both languages, the first-visit rule and the own-language rule', () => {
  const p = buildKaiPrompt(ctx());
  const all = `${p.system}\n${p.user}`;
  expect(all).toContain('A1');
  expect(all).toContain('Spanish');
  expect(all).toContain('English');
  expect(all).toContain('first visit');
  expect(all).toContain('may write in English');
});

test('prompt for a later opening of a C1 learner has no first-visit rule and no own-language rule', () => {
  const p = buildKaiPrompt(ctx({ cefr: 'C1', firstVisit: false }));
  const all = `${p.system}\n${p.user}`;
  expect(all).toContain('C1');
  expect(all).not.toContain('first visit');
  expect(all).not.toContain('may write in English');
});

test('prompt always carries the standing rules', () => {
  const p = buildKaiPrompt(ctx({ opening: false, firstVisit: false, userText: 'Hola' })).system;
  for (const rule of ['160 characters', 'emoji', '**bold**', 'only when the learner asks', 'language learning', 'Never ask', 'not offer', '"review"']) expect(p).toContain(rule);
});

test('prompt carries notes, word facts, the words and the history', () => {
  const p = buildKaiPrompt(
    ctx({
      opening: false,
      firstVisit: false,
      userText: '¿Qué significa propina?',
      notes: ['Starts a job in a café in March'],
      history: [{ from: 'kai', text: '¡Hola Maya!' }],
      words: { total: 30, reviewedLastDay: 12, dueNow: 5, sample: [{ word: 'la propina', translation: 'the tip' }] },
    }),
  ).user;
  for (const part of ['Starts a job in a café in March', '30', '12', '5', 'la propina', '¡Hola Maya!', '¿Qué significa propina?']) expect(p).toContain(part);
});

// ---- Small rules ----
test('notes: a new note is added, a saved one is skipped, only the newest 50 are kept', () => {
  expect(nextNotes(['a'], ['b', 'a', 'b'])).toEqual({ add: ['b'], drop: 0 });
  const full = Array.from({ length: 50 }, (_, i) => `n${i}`);
  expect(nextNotes(full, ['new'])).toEqual({ add: ['new'], drop: 1 });
  expect(nextNotes(full, [])).toEqual({ add: [], drop: 0 });
});

test('translation default: on for A1 and A2, off for B1 and above; a saved choice wins', () => {
  expect(['A1', 'A2', 'A2+', 'B1', 'B2', 'C1', 'C2'].map((cefr) => defaultTranslationOn(null, cefr, 'intermediate'))).toEqual([true, true, true, false, false, false, false]);
  expect(defaultTranslationOn(false, 'A1', 'beginner')).toBe(false);
  expect(defaultTranslationOn(true, 'C1', 'advanced')).toBe(true);
  // No CEFR yet: follow the level picked in onboarding.
  expect(defaultTranslationOn(null, null, 'brand_new')).toBe(true);
  expect(defaultTranslationOn(null, null, 'advanced')).toBe(false);
});

// ---- Routes, with fake stores ----
const profile: Profile = { learningLanguage: 'Spanish', nativeLanguage: 'English', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] };
type Row = KaiMessage & { userId: string };
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let rows: Row[];
let notes: Record<string, string[]>;
let saved: Record<string, boolean | null>;
let profilesByUser: Record<string, Profile>;
let facts: KaiFacts['words'];
let seen: KaiContext[];
let kaiChat: KaiChat;
let now: Date;
let ids: { a: string; b: string };

const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const profiles: ProfilesStore = { upsert: async (_u, p) => p, get: async (u) => profilesByUser[u] ?? null, setChat: async () => true };
const store: KaiStore = {
  messages: async (userId, limit) => rows.filter((r) => r.userId === userId).slice(-limit),
  lastOpeningAt: async (userId) => rows.filter((r) => r.userId === userId && r.opening).at(-1)?.createdAt ?? null,
  userTurnsSince: async (userId, since) => rows.filter((r) => r.userId === userId && r.from === 'user' && r.createdAt >= since).length,
  notes: async (userId) => notes[userId] ?? [],
  facts: async (userId) => ({ name: 'Maya', translationOn: saved[userId] ?? null, words: facts }),
  setTranslation: async (userId, on) => {
    if (!profilesByUser[userId]) return false;
    saved[userId] = on;
    return true;
  },
  addTurn: async (userId, turn, at) => {
    const mk = (from: 'kai' | 'user', text: string, translation: string | null, options: string[] = []): Row => ({ id: crypto.randomUUID(), userId, from, text, translation, options, opening: turn.opening, createdAt: at });
    const userMessage = turn.user === null ? null : mk('user', turn.user, null);
    const kai = turn.kai.map((l, i) => mk('kai', l.text, l.translation, i === turn.kai.length - 1 ? turn.options : []));
    rows.push(...(userMessage ? [userMessage] : []), ...kai);
    notes[userId] = [...(notes[userId] ?? []).slice(turn.notes.drop), ...turn.notes.add];
    return { userMessage, messages: kai };
  },
};
type Call = (path: string, method?: string, body?: unknown) => Promise<Response>;
let alice: Call;
let bob: Call;

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  ids = { a: crypto.randomUUID(), b: crypto.randomUUID() };
  rows = [];
  notes = {};
  saved = {};
  seen = [];
  now = new Date('2026-11-17T10:00:00Z');
  facts = { total: 0, reviewedLastDay: 0, dueNow: 0, sample: [] };
  profilesByUser = { [ids.a]: profile, [ids.b]: { ...profile, cefr: 'B1' } };
  kaiChat = { answer: async (c) => (seen.push(c), fixtureKaiChat.answer(c)) };
  const as = (token: string): Call => (path, method = 'GET', body) =>
    Promise.resolve(
      createApp({ keys: t.keys, issuer: ISSUER, users, profiles, kai: store, kaiChat, kaiNow: () => now }).request(path, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  alice = as(await t.token({ sub: ids.a }));
  bob = as(await t.token({ sub: ids.b }));
});
const json = async <T>(r: Response | Promise<Response>) => (await (await r).json()) as T;
type Chat = { messages: { id: string; from: string; text: string; translation: string | null; createdAt: string }[]; options: string[]; translationOn: boolean };
type Turn = { userMessage: { from: string; text: string } | null; messages: { from: string; text: string; translation: string | null }[]; options: string[]; action: string | null };

test('read: an empty chat has no messages and no options; the default follows the level', async () => {
  expect(await json<Chat>(alice('/v1/kai/chat'))).toEqual({ messages: [], options: [], translationOn: true, nativeLanguage: 'English' });
  expect((await json<Chat>(bob('/v1/kai/chat'))).translationOn).toBe(false);
});

test('a turn saves the user message and 1 to 3 Kai lines; reading shows them in order; chats are private', async () => {
  const res = await alice('/v1/kai/chat/turns', 'POST', { text: 'Hola' });
  expect(res.status).toBe(200);
  const turn = (await res.json()) as Turn;
  expect(turn.userMessage).toMatchObject({ from: 'user', text: 'Hola' });
  expect(turn.messages.length).toBeGreaterThanOrEqual(1);
  expect(turn.messages.length).toBeLessThanOrEqual(3);
  for (const m of turn.messages) expect(m).toMatchObject({ from: 'kai', text: expect.any(String), translation: expect.any(String) });

  const chat = await json<Chat>(alice('/v1/kai/chat'));
  expect(chat.messages.map((m) => m.from)).toEqual(['user', ...turn.messages.map(() => 'kai')]);
  expect(chat.messages[0]).toMatchObject({ text: 'Hola', translation: null });
  expect(chat.options).toEqual(turn.options);
  expect(Object.keys(chat.messages[0]!).sort()).toEqual(['createdAt', 'from', 'id', 'text', 'translation']);
  expect((await json<Chat>(bob('/v1/kai/chat'))).messages).toEqual([]);
});

test('options belong to the last message only when Kai wrote it', async () => {
  await alice('/v1/kai/chat/turns', 'POST', { text: 'Hola' });
  rows.push({ id: 'x', userId: ids.a, from: 'user', text: 'later', translation: null, options: [], opening: false, createdAt: now });
  expect((await json<Chat>(alice('/v1/kai/chat'))).options).toEqual([]);
});

test('a turn needs a profile (409) and a text of 1 to 500 characters (400)', async () => {
  delete profilesByUser[ids.a];
  const res = await alice('/v1/kai/chat/turns', 'POST', { text: 'Hola' });
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: 'no_profile' });
  expect((await bob('/v1/kai/chat/turns', 'POST', { text: '' })).status).toBe(400);
  expect((await bob('/v1/kai/chat/turns', 'POST', { text: 'x'.repeat(501) })).status).toBe(400);
  expect((await bob('/v1/kai/chat/turns', 'POST', {})).status).toBe(400);
  expect((await bob('/v1/kai/chat/turns', 'POST', { text: 'Hola', open: true })).status).toBe(400);
  expect(rows).toEqual([]);
});

test('opening: first visit, then nothing for 12 hours, then a new one that is not a first visit', async () => {
  const first = await json<Turn>(alice('/v1/kai/chat/turns', 'POST', { open: true }));
  expect(first.userMessage).toBeNull();
  expect(first.messages.length).toBeGreaterThanOrEqual(1);
  expect(seen[0]).toMatchObject({ opening: true, firstVisit: true, userText: null });

  now = new Date(now.getTime() + 60 * 60 * 1000);
  const again = await json<Turn>(alice('/v1/kai/chat/turns', 'POST', { open: true }));
  expect(again).toEqual({ userMessage: null, messages: [], options: [], action: null });
  expect(rows).toHaveLength(first.messages.length);
  expect(seen).toHaveLength(1);

  now = new Date(now.getTime() + OPENING_GAP_MS);
  const next = await json<Turn>(alice('/v1/kai/chat/turns', 'POST', { open: true }));
  expect(next.messages.length).toBeGreaterThanOrEqual(1);
  expect(seen[1]).toMatchObject({ opening: true, firstVisit: false });
});

test('what Kai is told: profile, notes, word facts with at most 10 words, and only the newest 20 messages', async () => {
  notes[ids.a] = ['Likes tacos', 'Trip to Mexico in May'];
  facts = { total: 30, reviewedLastDay: 12, dueNow: 5, sample: Array.from({ length: 10 }, (_, i) => ({ word: `w${i}`, translation: `t${i}` })) };
  for (let i = 0; i < 60; i++) rows.push({ id: `m${i}`, userId: ids.a, from: i % 2 ? 'kai' : 'user', text: `msg ${i}`, translation: null, options: [], opening: false, createdAt: now });
  await alice('/v1/kai/chat/turns', 'POST', { text: 'Hola' });
  const c = seen[0]!;
  expect(c).toMatchObject({ name: 'Maya', cefr: 'A2', learningLanguage: 'Spanish', nativeLanguage: 'English', knownWords: 600, goal: 'travel', interests: ['food'], opening: false, firstVisit: false, userText: 'Hola' });
  expect(c.notes).toEqual(['Likes tacos', 'Trip to Mexico in May']);
  expect(c.words).toMatchObject({ total: 30, reviewedLastDay: 12, dueNow: 5 });
  expect(c.words.sample.length).toBeLessThanOrEqual(10);
  expect(c.history).toHaveLength(20);
  expect(c.history.at(-1)).toEqual({ from: 'kai', text: 'msg 59' });
});

test('Kai is told language names, also when the profile keeps codes', async () => {
  profilesByUser[ids.a] = { ...profile, learningLanguage: 'es', nativeLanguage: 'fa' };
  await alice('/v1/kai/chat/turns', 'POST', { text: 'Hola' });
  expect(seen[0]).toMatchObject({ learningLanguage: 'Spanish', nativeLanguage: 'Persian' });
  profilesByUser[ids.a] = { ...profile, learningLanguage: 'Swedish' };
  await alice('/v1/kai/chat/turns', 'POST', { text: 'Hej' });
  expect(seen[1]).toMatchObject({ learningLanguage: 'Swedish' });
});

test('Kai remembers: a new note is saved and used next turn; the same note is kept once', async () => {
  kaiChat = { answer: async (c) => (seen.push(c), { lines: [line('¡Qué bien!')], remember: ['Starts a job in a café in March'] }) };
  await alice('/v1/kai/chat/turns', 'POST', { text: 'I start a job in a café in March' });
  expect(notes[ids.a]).toEqual(['Starts a job in a café in March']);
  await alice('/v1/kai/chat/turns', 'POST', { text: 'again' });
  expect(seen[1]!.notes).toEqual(['Starts a job in a café in March']);
  expect(notes[ids.a]).toEqual(['Starts a job in a café in March']);
});

test('lead to Review: the action comes back with the lines', async () => {
  const turn = await json<Turn>(alice('/v1/kai/chat/turns', 'POST', { text: 'Vamos a practicar' }));
  expect(turn.action).toBe('review');
  expect(turn.messages.length).toBeGreaterThanOrEqual(1);
  expect((await json<Turn>(alice('/v1/kai/chat/turns', 'POST', { text: 'Hola' }))).action).toBeNull();
});

test('Kai fails safely: a thrown call is 502 and nothing is saved', async () => {
  kaiChat = { answer: async () => Promise.reject(new Error('model down')) };
  const res = await alice('/v1/kai/chat/turns', 'POST', { text: 'Hola' });
  expect(res.status).toBe(502);
  expect(await res.json()).toEqual({ error: 'kai_unavailable' });
  expect(rows).toEqual([]);
});

test('Kai fails safely: a wrong shape is tried once more; two wrong shapes are 502', async () => {
  let calls = 0;
  kaiChat = { answer: async () => (++calls === 1 ? { lines: [] } : { lines: [line('¡Hola!')] }) };
  expect((await alice('/v1/kai/chat/turns', 'POST', { text: 'Hola' })).status).toBe(200);
  expect(calls).toBe(2);

  calls = 0;
  kaiChat = { answer: async () => (calls++, { lines: [1, 2, 3, 4, 5].map((n) => line(`l${n}`)) }) };
  const before = rows.length;
  expect((await alice('/v1/kai/chat/turns', 'POST', { text: 'Hola' })).status).toBe(502);
  expect(calls).toBe(2);
  expect(rows).toHaveLength(before);
});

test('daily limit: the 201st message in 24 hours is 429 and nothing is saved; an opening does not count', async () => {
  for (let i = 0; i < 200; i++) rows.push({ id: `u${i}`, userId: ids.a, from: 'user', text: 'x', translation: null, options: [], opening: false, createdAt: new Date(now.getTime() - 60_000) });
  const res = await alice('/v1/kai/chat/turns', 'POST', { text: 'one more' });
  expect(res.status).toBe(429);
  expect(await res.json()).toEqual({ error: 'too_many_messages' });
  expect(rows).toHaveLength(200);
  expect((await alice('/v1/kai/chat/turns', 'POST', { open: true })).status).toBe(200);
  // Messages older than 24 hours do not count.
  for (const r of rows) r.createdAt = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  expect((await alice('/v1/kai/chat/turns', 'POST', { text: 'next day' })).status).toBe(200);
});

test('translation setting: saved choice wins over the level; no profile is 409; bad body is 400', async () => {
  const res = await alice('/v1/kai/chat/translation', 'PUT', { on: false });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ translationOn: false });
  expect((await json<Chat>(alice('/v1/kai/chat'))).translationOn).toBe(false);
  expect((await alice('/v1/kai/chat/translation', 'PUT', { on: 'yes' })).status).toBe(400);
  delete profilesByUser[ids.a];
  expect((await alice('/v1/kai/chat/translation', 'PUT', { on: true })).status).toBe(409);
});

test('no token → 401 on every Kai chat route', async () => {
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, kai: store, kaiChat });
  expect((await app.request('/v1/kai/chat')).status).toBe(401);
  expect((await app.request('/v1/kai/chat/turns', { method: 'POST' })).status).toBe(401);
  expect((await app.request('/v1/kai/chat/translation', { method: 'PUT' })).status).toBe(401);
});

// ---- The real call ----
test('claudeKaiChat sends the prompt with a 20 s limit and returns the JSON it gets', async () => {
  let sent: { url: string; body: Record<string, unknown>; signal: AbortSignal | null | undefined } | undefined;
  const fakeFetch = (async (url: string, init: RequestInit) => {
    sent = { url, body: JSON.parse(init.body as string) as Record<string, unknown>, signal: init.signal };
    return new Response(JSON.stringify({ content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"lines":[{"text":"¡Hola!","translation":"Hi!"}],"options":[]}' }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const answer = await claudeKaiChat('k', fakeFetch).answer(ctx());
  expect(KaiAnswerSchema.parse(answer).lines).toEqual([{ text: '¡Hola!', translation: 'Hi!' }]);
  expect(sent!.url).toBe('https://api.anthropic.com/v1/messages');
  expect(sent!.body.model).toBe('claude-sonnet-5-5');
  expect(sent!.body.system).toContain('Kai');
  expect(sent!.signal).toBeInstanceOf(AbortSignal);
  await expect(claudeKaiChat('k', (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch).answer(ctx())).rejects.toThrow();
});

test('claudeKaiChat tries a failed call once more (two tries inside the 20 s limit), and gives null for text that is not JSON', async () => {
  let calls = 0;
  const flaky = (async () => (++calls === 1 ? Promise.reject(new Error('stalled')) : new Response(JSON.stringify({ content: [{ type: 'text', text: '{"lines":[]}' }] }), { status: 200 }))) as unknown as typeof fetch;
  expect(await claudeKaiChat('k', flaky).answer(ctx())).toEqual({ lines: [] });
  expect(calls).toBe(2);
  calls = 0;
  const down = (async () => (calls++, Promise.reject(new Error('stalled')))) as unknown as typeof fetch;
  await expect(claudeKaiChat('k', down).answer(ctx())).rejects.toThrow('stalled');
  expect(calls).toBe(2);
  const prose = (async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'Sorry, no JSON here' }] }), { status: 200 })) as unknown as typeof fetch;
  expect(await claudeKaiChat('k', prose).answer(ctx())).toBeNull();
});
