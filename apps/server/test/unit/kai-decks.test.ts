import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type DecksStore, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { deckMix } from '../../src/decks/band.js';
import { toChatDecks, type DeckIdea } from '../../src/kai/abilities/decks.js';
import type { KaiMessage, KaiStore, KaiTurnToSave } from '../../src/kai/chat.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { buildKaiPrompt, fixtureKaiChat, KaiAnswerSchema, type KaiChat, type KaiContext } from '../../src/llm/kai-chat.js';
import { checkCards, deckPrompt, type DeckInput } from '../../src/llm/make-deck.js';
import type { Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const line = (text: string, translation = 'x') => ({ text, translation });
const idea = (over: Partial<DeckIdea> = {}): DeckIdea => ({ topic: 'Ordering food', title: 'Pedir comida', titleTranslation: 'Ordering food', reason: 'Para tu viaje', wordCount: 20, ...over });
const ctx = (over: Partial<KaiContext> = {}): KaiContext => ({
  name: 'Maya',
  learningLanguage: 'Spanish',
  nativeLanguage: 'English',
  cefr: 'A2',
  knownWords: 600,
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

// ---- The answer shape ----
test('answer shape: 1 or 3 deck ideas are kept; none is fine; 2 or 4 fail', () => {
  expect(KaiAnswerSchema.parse({ lines: [line('a')], decks: [idea()] }).decks).toEqual([idea()]);
  expect(KaiAnswerSchema.parse({ lines: [line('a')], decks: [idea(), idea({ topic: 'b' }), idea({ topic: 'c' })] }).decks).toHaveLength(3);
  expect(KaiAnswerSchema.parse({ lines: [line('a')] }).decks).toBeUndefined();
  expect(KaiAnswerSchema.parse({ lines: [line('a')], decks: [] }).decks).toBeUndefined();
  expect(KaiAnswerSchema.parse({ lines: [line('a')], decks: null }).decks).toBeUndefined();
  expect(KaiAnswerSchema.safeParse({ lines: [line('a')], decks: [idea(), idea()] }).success).toBe(false);
  expect(KaiAnswerSchema.safeParse({ lines: [line('a')], decks: [idea(), idea(), idea(), idea()] }).success).toBe(false);
});

test('answer shape: field limits of an idea', () => {
  const bad = (over: Record<string, unknown>) => KaiAnswerSchema.safeParse({ lines: [line('a')], decks: [{ ...idea(), ...over }] }).success;
  expect(bad({ topic: '' })).toBe(false);
  expect(bad({ topic: 'x'.repeat(81) })).toBe(false);
  expect(bad({ title: '' })).toBe(false);
  expect(bad({ titleTranslation: undefined })).toBe(false);
  expect(bad({ reason: 'x'.repeat(31) })).toBe(false);
  expect(bad({ reason: 'x'.repeat(30) })).toBe(true);
});

test('answer shape: wordCount is a whole number from 10 to 30', () => {
  const ok = (wordCount: unknown) => KaiAnswerSchema.safeParse({ lines: [line('a')], decks: [{ ...idea(), wordCount }] }).success;
  expect([10, 12, 20, 30].map(ok)).toEqual([true, true, true, true]);
  expect([5, 9, 31, 40, 12.5, '20', undefined].map(ok)).toEqual([false, false, false, false, false, false, false]);
});

// ---- The prompt ----
test('prompt carries the facts: new words left, the topics of their decks and of ideas already offered', () => {
  const p = buildKaiPrompt(ctx({ decks: { newWordsLeft: 4, topics: ['Ordering food'], offered: ['At the hotel'] } }));
  expect(p.user).toContain('4');
  expect(p.user).toContain('Ordering food');
  expect(p.user).toContain('At the hotel');
});

test('prompt carries the offer rules and the size rule on every turn', () => {
  for (const c of [ctx(), ctx({ opening: true, userText: null }), ctx({ cefr: 'C1' })]) {
    const p = buildKaiPrompt(c).system;
    for (const rule of ['"decks"', 'exactly 3', 'exactly 1', 'fewer than 10 new words', 'Never repeat a topic', 'at most ONE short question', 'their own deck', 'from 10 to 30', 'how wide the topic is', 'beginner', '"wordCount"', '"titleTranslation"']) expect(p).toContain(rule);
  }
});

test('prompt on the first visit: ask before showing the decks', () => {
  const p = buildKaiPrompt(ctx({ opening: true, firstVisit: true, userText: null }));
  expect(p.user).toContain('3 decks ready');
  expect(p.user).toContain('Do not send "decks"');
  expect(buildKaiPrompt(ctx({ opening: true, userText: null })).user).not.toContain('3 decks ready');
});

test('prompt for the ready event names the deck and asks for the two options', () => {
  const p = buildKaiPrompt(ctx({ userText: null, event: { deckReady: { title: 'Pedir comida', wordCount: 24 } } })).user;
  expect(p).toContain('Pedir comida');
  expect(p).toContain('24');
  expect(p).toContain('ready');
  expect(p).toContain('Review');
  expect(p).toContain('another deck');
  expect(p).not.toContain('The learner now says');
});

// ---- Decks in chat messages ----
test('decks of a message: in the order they were offered, with the status now and `current`', () => {
  const rows = [
    { id: 'd1', title: 'Uno', titleTranslation: 'One', reason: 'r1', cefr: 'A2', wordCount: 12, status: 'ready' },
    { id: 'd2', title: 'Dos', titleTranslation: null, reason: 'r2', cefr: 'A2', wordCount: 30, status: 'proposed' },
  ];
  const byId = new Map(rows.map((r) => [r.id, r]));
  expect(toChatDecks(['d2', 'd1', 'gone'], byId, true)).toEqual([
    { id: 'd2', title: 'Dos', titleTranslation: null, reason: 'r2', cefr: 'A2', wordCount: 30, status: 'proposed', current: true },
    { id: 'd1', title: 'Uno', titleTranslation: 'One', reason: 'r1', cefr: 'A2', wordCount: 12, status: 'ready', current: true },
  ]);
  expect(toChatDecks(['d1'], byId, false)[0]!.current).toBe(false);
  expect(toChatDecks([], byId, true)).toEqual([]);
});

// ---- The stand-in Kai ----
test('fixture: first visit asks before showing; yes gives 3 ideas; an own idea gives 1; ready gives the two options', async () => {
  const answer = async (over: Partial<KaiContext>) => KaiAnswerSchema.parse(await fixtureKaiChat.answer(ctx(over)));
  const first = await answer({ opening: true, firstVisit: true, userText: null });
  expect(first.decks).toBeUndefined();
  expect(first.lines.at(-1)!.translation).toContain('3 decks');
  expect(first.options[0]).toBe('Sí, quiero verlos');

  const yes = await answer({ userText: first.options[0]! });
  expect(yes.decks).toHaveLength(3);
  expect(new Set(yes.decks!.map((d) => d.topic)).size).toBe(3);
  for (const d of yes.decks!) expect(d.wordCount).toBeGreaterThanOrEqual(10);
  // Topics the learner already has are not offered again.
  const again = await answer({ userText: 'Una sugerencia', decks: { newWordsLeft: 0, topics: [yes.decks![0]!.topic], offered: [yes.decks![1]!.topic] } });
  expect(again.decks).toHaveLength(3);
  expect(again.decks!.map((d) => d.topic)).not.toContain(yes.decks![0]!.topic);
  expect(again.decks!.map((d) => d.topic)).not.toContain(yes.decks![1]!.topic);

  const own = await answer({ userText: 'Quiero un mazo sobre trabajar en una cafetería' });
  expect(own.decks).toHaveLength(1);
  expect(own.decks![0]!.topic).toContain('cafetería');

  const ready = await answer({ userText: null, event: { deckReady: { title: 'Pedir comida', wordCount: 12 } } });
  expect(ready.decks).toBeUndefined();
  expect(ready.options).toEqual(['Vamos a practicar', 'Hacer otro mazo']);
  expect(ready.action).toBeNull();

  const another = await answer({ userText: 'Hacer otro mazo' });
  expect(another.decks).toBeUndefined();
  expect(another.options).toEqual(['Una sugerencia', 'Mi propia idea']);
  // The older steps still work.
  expect((await answer({ userText: 'Vamos a practicar' })).action).toBe('review');
});

// ---- The deck's own size ----
const input: DeckInput = { topic: 'Ordering food', learningLanguage: 'es', nativeLanguage: 'en', cefr: 'A2', level: 'some_basics', knownWords: 900, goal: 'travel', goalOther: null, interests: ['food'] };

test('fixture deck maker gives as many different cards as asked, and the first 10 stay the same', async () => {
  const ten = await fixtureDeckMaker.cards(input);
  expect(ten).toHaveLength(10);
  for (const size of [10, 12, 24, 30]) {
    const cards = await fixtureDeckMaker.cards({ ...input, wordCount: size });
    expect(cards).toHaveLength(size);
    expect(new Set(cards.map((c) => c.word!.toLowerCase())).size).toBe(size);
    expect(cards.slice(0, 10)).toEqual(ten);
  }
  expect(ten[0]).toMatchObject({ word: 'la cuenta' });
});

test('checks use the deck size: fewer good cards than the size fails, more keeps the first ones', async () => {
  const cards = await fixtureDeckMaker.cards({ ...input, wordCount: 30 });
  expect(checkCards(cards, 24)).toHaveLength(24);
  expect(checkCards(cards, 30)).toHaveLength(30);
  expect(() => checkCards(cards.slice(0, 23), 24)).toThrow('only 23 good cards');
  expect(checkCards(cards)).toHaveLength(10); // no size given: the first deck's 10
});

test('deck prompt asks for exactly the deck size and scales the easy / at-level / stretch mix', () => {
  const p10 = deckPrompt(input);
  expect(p10).toContain('exactly 10 different words');
  expect(p10).toContain('about 3 easy items');
  const p20 = deckPrompt({ ...input, wordCount: 20 });
  expect(p20).toContain('exactly 20 different words');
  expect(p20).toContain('about 5 easy items');
  expect(p20).toContain('about 10 items right at their level');
  expect(p20).toContain('about 5 stretch items');
  expect(p20).not.toContain('about 3 easy items');
  // 25 % easy, 50 % at level, 25 % stretch, and the parts add up to the size.
  for (let size = 10; size <= 30; size++) {
    const m = /about (\d+) easy items .* about (\d+) items right at their level .* about (\d+) stretch items/.exec(deckMix(2, null, size))!;
    const [easy, level, stretch] = [Number(m[1]), Number(m[2]), Number(m[3])];
    expect(easy + level + stretch).toBe(size);
    expect(level).toBe(Math.round(size / 2));
    expect(Math.abs(easy - stretch)).toBeLessThanOrEqual(1);
  }
});

test('band texts with counts scale with the size and are the doc text at 10', () => {
  expect(deckMix(3, null)).toContain('About 4 less common single words, 3 collocations');
  expect(deckMix(3, null, 10)).toBe(deckMix(3, null));
  expect(deckMix(3, null, 20)).toContain('About 8 less common single words, 6 collocations');
  expect(deckMix(3, null, 20)).toContain('and 6 useful everyday phrases');
  expect(deckMix(4, null, 30)).toContain('about 9 advanced single words, 12 collocations and 9 idiomatic');
  expect(deckMix(0, null, 20)).toContain('at most 4 tiny fixed phrases');
  expect(deckMix(1, null, 10)).toContain('at most 1 short fixed phrase.');
  expect(deckMix(1, null, 30)).toContain('at most 3 short fixed phrases.');
  expect(deckMix(2, null, 20)).toContain('plus 4 short, useful phrases');
});

// ---- Routes, with fake stores ----
const profile: Profile = { learningLanguage: 'Spanish', nativeLanguage: 'English', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] };
type Deck = Awaited<ReturnType<DecksStore['create']>>;
type Row = KaiMessage & { userId: string; deckIds: string[]; readyDeckId?: string };
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let rows: Row[];
let deckRows: Map<string, Deck & { userId: string }>;
let turns: KaiTurnToSave[];
let seen: KaiContext[];
let kaiChat: KaiChat;
let ids: { a: string; b: string };
const now = new Date('2026-11-18T10:00:00Z');

const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const profiles: ProfilesStore = { upsert: async (_u, p) => p, get: async () => profile, setChat: async () => true };
const decks = { get: async (userId: string, id: string) => (deckRows.get(id)?.userId === userId ? deckRows.get(id)! : null) } as unknown as DecksStore;
const withDecks = (r: Row): Row => {
  const newest = rows.filter((x) => x.userId === r.userId && x.deckIds.length).at(-1);
  return { ...r, decks: toChatDecks(r.deckIds, deckRows as never, newest?.id === r.id) };
};
const store: KaiStore = {
  messages: async (userId, limit) => rows.filter((r) => r.userId === userId).slice(-limit).map(withDecks),
  lastOpeningAt: async (userId) => rows.filter((r) => r.userId === userId && r.opening).at(-1)?.createdAt ?? null,
  userTurnsSince: async () => 0,
  notes: async () => [],
  facts: async () => ({ name: 'Maya', translationOn: null, words: { total: 12, reviewedLastDay: 8, dueNow: 4, sample: [] }, decks: { newWordsLeft: 4, topics: ['Ordering food'], offered: [] } }),
  setTranslation: async () => true,
  saidReady: async (userId, deckId) => rows.some((r) => r.userId === userId && r.readyDeckId === deckId),
  addTurn: async (userId, turn, at) => {
    turns.push(turn);
    const mk = (from: 'kai' | 'user', text: string, translation: string | null): Row => ({ id: crypto.randomUUID(), userId, from, text, translation, options: [], opening: turn.opening, createdAt: at, deckIds: [] });
    const userMessage = turn.user === null ? null : mk('user', turn.user, null);
    const kai = turn.kai.map((l) => mk('kai', l.text, l.translation));
    const last = kai.at(-1)!;
    last.options = turn.options;
    last.readyDeckId = turn.readyDeckId;
    for (const d of turn.decks?.ideas ?? []) {
      const id = crypto.randomUUID();
      deckRows.set(id, { id, userId, topic: d.topic, title: d.title, titleTranslation: d.titleTranslation, reason: d.reason, cefr: turn.decks!.cefr, wordCount: d.wordCount, status: 'proposed', cards: [] });
      last.deckIds.push(id);
    }
    rows.push(...(userMessage ? [userMessage] : []), ...kai);
    return { userMessage, messages: kai.map(withDecks) };
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
  deckRows = new Map();
  turns = [];
  seen = [];
  kaiChat = { answer: async (c) => (seen.push(c), fixtureKaiChat.answer(c)) };
  const as = (token: string): Call => (path, method = 'GET', body) =>
    Promise.resolve(
      createApp({ keys: t.keys, issuer: ISSUER, users, profiles, decks, kai: store, kaiChat: { answer: (c, d) => kaiChat.answer(c, d) }, kaiNow: () => now }).request(path, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  alice = as(await t.token({ sub: ids.a }));
  bob = as(await t.token({ sub: ids.b }));
});
type ChatDeck = { id: string; title: string; titleTranslation: string | null; reason: string; cefr: string; wordCount: number; status: string; current: boolean };
type Message = { id: string; from: string; text: string; decks?: ChatDeck[] };
type Turn = { userMessage: Message | null; messages: Message[]; options: string[]; action: string | null };
const json = async <T>(r: Response | Promise<Response>) => (await (await r).json()) as T;
const three = [idea({ wordCount: 12 }), idea({ topic: 'At the hotel', title: 'En el hotel', wordCount: 20 }), idea({ topic: 'Small talk', title: 'Charlar', wordCount: 30 })];
const says = (answer: unknown) => (kaiChat = { answer: async (c) => (seen.push(c), answer) });

test('three ideas: saved with the profile level and their sizes, and linked to Kai’s last line only', async () => {
  says({ lines: [line('Mira'), line('3 mazos para ti')], decks: three });
  const res = await alice('/v1/kai/chat/turns', 'POST', { text: 'Quiero palabras nuevas' });
  expect(res.status).toBe(200);
  const turn = (await res.json()) as Turn;
  expect(turns[0]!.decks).toEqual({ ideas: three, cefr: 'A2' });
  expect(turn.messages[0]!.decks).toBeUndefined();
  expect(turn.messages[1]!.decks!.map((d) => d.wordCount)).toEqual([12, 20, 30]);
  for (const d of turn.messages[1]!.decks!) expect(d).toMatchObject({ status: 'proposed', current: true, cefr: 'A2', titleTranslation: 'Ordering food', reason: 'Para tu viaje' });
  expect(Object.keys(turn.messages[1]!.decks![0]!).sort()).toEqual(['cefr', 'current', 'id', 'reason', 'status', 'title', 'titleTranslation', 'wordCount']);
  const chat = await json<{ messages: Message[] }>(alice('/v1/kai/chat'));
  expect(chat.messages.map((m) => m.decks?.length ?? 0)).toEqual([0, 0, 3]);
  expect((await json<{ messages: Message[] }>(bob('/v1/kai/chat'))).messages).toEqual([]);
});

test('own idea: one deck with that topic', async () => {
  says({ lines: [line('¡Claro!')], decks: [idea({ topic: 'Working in a coffee shop', wordCount: 15 })] });
  const turn = await json<Turn>(alice('/v1/kai/chat/turns', 'POST', { text: 'A deck for my coffee shop job' }));
  expect(turn.messages[0]!.decks).toHaveLength(1);
  expect([...deckRows.values()].map((d) => d.topic)).toEqual(['Working in a coffee shop']);
});

test('older ideas are not current once Kai offers new ones', async () => {
  says({ lines: [line('uno')], decks: three });
  await alice('/v1/kai/chat/turns', 'POST', { text: 'ideas' });
  says({ lines: [line('dos')], decks: [idea({ topic: 'Other' })] });
  await alice('/v1/kai/chat/turns', 'POST', { text: 'otra' });
  const chat = await json<{ messages: Message[] }>(alice('/v1/kai/chat'));
  const withCards = chat.messages.filter((m) => m.decks?.length);
  expect(withCards.map((m) => m.decks!.map((d) => d.current))).toEqual([[false, false, false], [true]]);
});

test('two ideas, or a bad size: the turn fails as "Kai fails safely" says and nothing is saved', async () => {
  for (const bad of [[idea(), idea()], [idea({ wordCount: 5 })], [idea({ wordCount: 40 })]]) {
    seen = [];
    says({ lines: [line('a')], decks: bad });
    const res = await alice('/v1/kai/chat/turns', 'POST', { text: 'ideas' });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'kai_unavailable' });
    expect(seen).toHaveLength(2); // asked once more
  }
  expect(rows).toEqual([]);
  expect(deckRows.size).toBe(0);
});

test('first visit: ideas the AI sends anyway are not saved (Kai asks first)', async () => {
  says({ lines: [line('¡Hola!')], decks: three });
  const turn = await json<Turn>(alice('/v1/kai/chat/turns', 'POST', { open: true }));
  expect(seen[0]).toMatchObject({ firstVisit: true });
  expect(turn.messages[0]!.decks).toBeUndefined();
  expect(deckRows.size).toBe(0);
});

test('what Kai is told: new words left, topics, and which decks its earlier lines showed', async () => {
  says({ lines: [line('uno')], decks: [idea()] });
  await alice('/v1/kai/chat/turns', 'POST', { text: 'ideas' });
  await alice('/v1/kai/chat/turns', 'POST', { text: 'gracias' });
  expect(seen[1]!.decks).toEqual({ newWordsLeft: 4, topics: ['Ordering food'], offered: [] });
  expect(seen[1]!.history.find((h) => h.from === 'kai')!.text).toContain('Pedir comida');
});

const readyDeck = (userId: string, status: Deck['status'] = 'ready') => {
  const id = crypto.randomUUID();
  deckRows.set(id, { id, userId, topic: 'Ordering food', title: 'Pedir comida', titleTranslation: 'Ordering food', reason: 'r', cefr: 'A2', wordCount: 24, status, cards: [] });
  return id;
};

test('deck is ready: Kai is told which deck, speaks once, and a second event adds nothing', async () => {
  const deckId = readyDeck(ids.a);
  const res = await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId });
  expect(res.status).toBe(200);
  const turn = (await res.json()) as Turn;
  expect(turn.userMessage).toBeNull();
  expect(turn.messages.length).toBeGreaterThanOrEqual(1);
  expect(turn.options).toEqual(['Vamos a practicar', 'Hacer otro mazo']);
  expect(seen[0]).toMatchObject({ opening: false, userText: null, event: { deckReady: { title: 'Pedir comida', wordCount: 24 } } });
  expect(turns[0]).toMatchObject({ user: null, opening: false, readyDeckId: deckId });

  const before = rows.length;
  const again = await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId });
  expect(again.status).toBe(200);
  expect(await again.json()).toEqual({ userMessage: null, messages: [], options: [], action: null });
  expect(rows).toHaveLength(before);
  expect(seen).toHaveLength(1);
});

test('deck is ready: not ready is 409, another user’s or an unknown deck is 404, and nothing is saved', async () => {
  const generating = await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: readyDeck(ids.a, 'generating') });
  expect(generating.status).toBe(409);
  expect(await generating.json()).toEqual({ error: 'deck_not_ready' });
  expect((await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: readyDeck(ids.a, 'proposed') })).status).toBe(409);
  const notMine = await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: readyDeck(ids.b) });
  expect(notMine.status).toBe(404);
  expect(await notMine.json()).toEqual({ error: 'not_found' });
  expect((await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: crypto.randomUUID() })).status).toBe(404);
  expect((await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: 'not-a-uuid' })).status).toBe(404);
  expect(rows).toEqual([]);
  expect(seen).toEqual([]);
});

test('the ready event needs a deck id and comes alone (400)', async () => {
  const deckId = readyDeck(ids.a);
  expect((await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready' })).status).toBe(400);
  expect((await alice('/v1/kai/chat/turns', 'POST', { deckId })).status).toBe(400);
  expect((await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId, text: 'Hola' })).status).toBe(400);
  expect((await alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId, open: true })).status).toBe(400);
  expect((await alice('/v1/kai/chat/turns', 'POST', { event: 'other', deckId })).status).toBe(400);
});

test('a ready turn never carries new ideas or the review action', async () => {
  const deckId = readyDeck(ids.a);
  says({ lines: [line('¡Listo!')], options: ['Vamos a practicar', 'Hacer otro mazo'], decks: three, action: 'review' });
  const turn = await json<Turn>(alice('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId }));
  expect(turn.action).toBeNull();
  expect(turn.messages[0]!.decks).toBeUndefined();
  expect(deckRows.size).toBe(1);
});

test('deck answers carry titleTranslation (null for an older deck) and wordCount', async () => {
  const id = readyDeck(ids.a, 'proposed');
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, decks, deckMaker: fixtureDeckMaker });
  const headers = { Authorization: `Bearer ${await t.token({ sub: ids.a })}` };
  expect(await (await app.request(`/v1/decks/${id}`, { headers })).json()).toMatchObject({ title: 'Pedir comida', titleTranslation: 'Ordering food', wordCount: 24 });
  const old = deckRows.get(id)!;
  delete (old as { titleTranslation?: unknown }).titleTranslation;
  expect(((await (await app.request(`/v1/decks/${id}`, { headers })).json()) as { titleTranslation: unknown }).titleTranslation).toBeNull();
});
