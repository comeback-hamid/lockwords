import { beforeAll, expect, test } from 'vitest';

import { createApp, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { pickRandomDeck, RANDOM_DECK_SIZE, randomDeckTitle, type RandomWordsStore } from '../../src/decks/random-words.js';
import { cardExample, KaiWordSchema, wordInHistory } from '../../src/kai/abilities/words.js';
import type { KaiMessage, KaiStore } from '../../src/kai/chat.js';
import { buildKaiPrompt, fixtureKaiChat, KaiAnswerSchema, type KaiContext } from '../../src/llm/kai-chat.js';
import type { Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const line = { text: 'Se dice **para llevar** 🥡', translation: 'You say “para llevar”' };
const word = { word: 'para llevar', translation: 'to go (takeaway)', example: 'Un café **para llevar**, por favor.', exampleTranslation: 'A coffee to go, please.' };
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
  opening: false,
  firstVisit: false,
  userText: 'Hola',
  ...over,
});

// ---- The word part of Kai's answer ----
test('answer shape: a word has four fields; no word is left out', () => {
  expect(KaiAnswerSchema.parse({ lines: [line], word }).word).toEqual(word);
  expect(KaiAnswerSchema.parse({ lines: [line] }).word).toBeUndefined();
  expect(KaiAnswerSchema.parse({ lines: [line], word: null }).word).toBeUndefined();
});

test('answer shape: a word with a missing or empty field, or a word over 60 characters, fails the whole answer', () => {
  for (const field of ['word', 'translation', 'example', 'exampleTranslation'] as const) {
    expect(KaiAnswerSchema.safeParse({ lines: [line], word: { ...word, [field]: undefined } }).success).toBe(false);
    expect(KaiAnswerSchema.safeParse({ lines: [line], word: { ...word, [field]: '  ' } }).success).toBe(false);
  }
  expect(KaiWordSchema.safeParse({ ...word, word: 'x'.repeat(60) }).success).toBe(true);
  expect(KaiWordSchema.safeParse({ ...word, word: 'x'.repeat(61) }).success).toBe(false);
  expect(KaiWordSchema.safeParse({ ...word, example: 'x'.repeat(301) }).success).toBe(false);
  expect(KaiAnswerSchema.safeParse({ lines: [line], word: 'para llevar' }).success).toBe(false);
});

test('bold marks in the word, the meaning and the example translation are taken out; the example keeps them', () => {
  const w = KaiWordSchema.parse({ word: '**para llevar**', translation: '**to go**', example: 'Un café **para llevar**.', exampleTranslation: 'A coffee **to go**.' });
  expect(w).toEqual({ word: 'para llevar', translation: 'to go', example: 'Un café **para llevar**.', exampleTranslation: 'A coffee to go.' });
  expect(KaiWordSchema.safeParse({ ...word, word: '****' }).success).toBe(false);
});

test('the example on a card is plain text: the marks around the word are taken out', () => {
  expect(cardExample('Un café **para llevar**, por favor.')).toBe('Un café para llevar, por favor.');
});

// ---- The prompt ----
test('prompt always carries the word-card rule and the shape of "word"', () => {
  for (const c of [ctx(), ctx({ opening: true, firstVisit: true, userText: null }), ctx({ cefr: 'C1' })]) {
    const p = buildKaiPrompt(c).system;
    for (const part of ['word card', 'how to say', 'what a word means', '"word"', '"translation"', '"example"', '"exampleTranslation"', 'no card', 'Another way to say it', 'no emoji']) expect(p).toContain(part);
  }
});

test('Kai is told which word a card in the chat held', () => {
  expect(wordInHistory('Se dice **para llevar** 🥡', word)).toContain('para llevar = to go (takeaway)');
  expect(wordInHistory('Hola', undefined)).toBe('Hola');
});

// ---- The stand-in AI ----
test('the fixture answers "how do I say" and "what does it mean" with a word card, and other text with none', async () => {
  for (const text of ['How do I say "to go" for food?', '¿Cómo se dice to go?', 'What does para llevar mean?', '¿Qué significa para llevar?']) {
    const a = KaiAnswerSchema.parse(await fixtureKaiChat.answer(ctx({ userText: text })));
    expect(a.word).toMatchObject({ word: 'para llevar', translation: 'to go (takeaway)' });
    expect(a.lines).toHaveLength(1);
  }
  expect(KaiAnswerSchema.parse(await fixtureKaiChat.answer(ctx({ userText: 'Hola Kai' }))).word).toBeUndefined();
});

// ---- Which deck takes the word ----
test('target deck: none yet → number 1; room left → that deck; full → the next number', () => {
  expect(RANDOM_DECK_SIZE).toBe(30);
  expect(randomDeckTitle(2)).toBe('Random Words 2');
  expect(pickRandomDeck([])).toEqual({ id: null, number: 1 });
  expect(pickRandomDeck([{ id: 'a', count: 29 }])).toEqual({ id: 'a', number: 1 });
  expect(pickRandomDeck([{ id: 'a', count: 30 }])).toEqual({ id: null, number: 2 });
  // Newest first: deck 2 has room, deck 1 is full.
  expect(pickRandomDeck([{ id: 'b', count: 3 }, { id: 'a', count: 30 }])).toEqual({ id: 'b', number: 2 });
  expect(pickRandomDeck([{ id: 'b', count: 30 }, { id: 'a', count: 30 }])).toEqual({ id: null, number: 3 });
});

// ---- Routes, with fake stores ----
const profile: Profile = { learningLanguage: 'Spanish', nativeLanguage: 'English', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: [] };
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const profiles: ProfilesStore = { upsert: async (_u, p) => p, get: async () => profile, setChat: async () => true };
let t: Awaited<ReturnType<typeof makeTestKeys>>;
beforeAll(async () => {
  t = await makeTestKeys();
});

test('a turn with a word: the word goes to the store with the turn and comes back on the last Kai message', async () => {
  const rows: KaiMessage[] = [];
  let savedWord: unknown;
  const kai: KaiStore = {
    messages: async () => rows,
    lastOpeningAt: async () => null,
    userTurnsSince: async () => 0,
    notes: async () => [],
    facts: async () => ({ name: null, translationOn: null, words: { total: 0, reviewedLastDay: 0, dueNow: 0, sample: [] } }),
    setTranslation: async () => true,
    addTurn: async (_u, turn, at) => {
      savedWord = turn.word;
      const mk = (from: 'kai' | 'user', text: string): KaiMessage => ({ id: crypto.randomUUID(), from, text, translation: null, options: [], opening: false, createdAt: at });
      const said = turn.kai.map((l) => mk('kai', l.text));
      if (turn.word) said[said.length - 1] = { ...said.at(-1)!, word: { ...turn.word, addTo: 'Random Words 1', added: false, already: false } };
      rows.push(mk('user', turn.user ?? ''), ...said);
      return { userMessage: rows.at(-said.length - 1)!, messages: said };
    },
  };
  const seen: KaiContext[] = [];
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, kai, kaiChat: { answer: async (c) => (seen.push(c), fixtureKaiChat.answer(c)) } });
  const headers = { Authorization: `Bearer ${await t.token({ sub: crypto.randomUUID() })}`, 'Content-Type': 'application/json' };
  const res = await app.request('/v1/kai/chat/turns', { method: 'POST', headers, body: JSON.stringify({ text: 'How do I say "to go" for food?' }) });
  expect(res.status).toBe(200);
  const turn = (await res.json()) as { userMessage: Record<string, unknown>; messages: { word?: Record<string, unknown> }[] };
  expect(savedWord).toMatchObject({ word: 'para llevar' });
  expect(turn.messages.at(-1)!.word).toEqual({ word: 'para llevar', translation: 'to go (takeaway)', example: 'Un café **para llevar**, por favor.', exampleTranslation: 'A coffee to go, please.', addTo: 'Random Words 1', added: false, already: false });
  expect('word' in turn.userMessage).toBe(false);
  // The next turn: Kai is told which word the card held.
  await app.request('/v1/kai/chat/turns', { method: 'POST', headers, body: JSON.stringify({ text: 'Gracias' }) });
  expect(seen[1]!.history.at(-1)!.text).toContain('para llevar = to go (takeaway)');
  // A turn with no word saves none.
  expect(savedWord).toBeUndefined();
});

test('add-word: 200 with the result, 404 for an unknown or malformed id, 409 for a message with no word, 401 with no token', async () => {
  const id = crypto.randomUUID();
  const asked: string[] = [];
  const randomWords: RandomWordsStore = {
    add: async (_u, messageId) => {
      asked.push(messageId);
      if (messageId === id) return { ok: true, result: { deckId: 'd1', deckTitle: 'Random Words 1', count: 1, already: false } };
      return { ok: false, error: messageId.startsWith('0') ? 'no_word' : 'not_found' };
    },
  };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, randomWords });
  const headers = { Authorization: `Bearer ${await t.token({ sub: crypto.randomUUID() })}` };
  const post = (messageId: string) => app.request(`/v1/kai/chat/messages/${messageId}/add-word`, { method: 'POST', headers });
  const ok = await post(id);
  expect(ok.status).toBe(200);
  expect(await ok.json()).toEqual({ deckId: 'd1', deckTitle: 'Random Words 1', count: 1, already: false });
  const none = await post('0b1e6c1e-0000-4000-8000-000000000000');
  expect(none.status).toBe(409);
  expect(await none.json()).toEqual({ error: 'no_word' });
  const missing = await post('9b1e6c1e-0000-4000-8000-000000000000');
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ error: 'not_found' });
  expect((await post('not-an-id')).status).toBe(404);
  expect(asked).not.toContain('not-an-id');
  expect((await app.request(`/v1/kai/chat/messages/${id}/add-word`, { method: 'POST' })).status).toBe(401);
});
