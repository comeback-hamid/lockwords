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
import type { DeckMaker } from '../../src/llm/make-deck.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// New words decks on the real database: ideas saved with a turn, decks in chat messages, the ready event, a deck's own size.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const kai = createKaiStore(db);
let now = new Date('2026-11-18T10:00:00Z');
let seen: KaiContext[] = [];
const fixture: KaiChat = { answer: async (c) => (seen.push(c), fixtureKaiChat.answer(c)) };
let kaiChat: KaiChat = fixture;
let deckMaker: DeckMaker = fixtureDeckMaker;
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
        deckMaker: { propose: (i) => deckMaker.propose(i), cards: (i) => deckMaker.cards(i) },
        cards: createCardsStore(db),
        kai,
        kaiChat: { answer: (c) => kaiChat.answer(c) },
        kaiNow: () => now,
      }).request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
});
afterAll(() => pool.end());

const profile = { learningLanguage: 'Spanish', nativeLanguage: 'English', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] };
type ChatDeck = { id: string; title: string; titleTranslation: string | null; reason: string; cefr: string; wordCount: number; status: string; current: boolean };
type Message = { id: string; from: string; text: string; decks?: ChatDeck[] };
type Chat = { messages: Message[]; options: string[] };
type Turn = { userMessage: Message | null; messages: Message[]; options: string[]; action: string | null };
type Deck = { id: string; topic: string; title: string; titleTranslation: string | null; wordCount: number; status: string; cards: { position: number; word: string; stage: number }[] };
const json = async <T>(r: Promise<Response>) => (await (await r).json()) as T;
const tick = () => (now = new Date(now.getTime() + 1000));
const idea = (topic: string, wordCount: number) => ({ topic, title: `Título: ${topic}`, titleTranslation: `Title: ${topic}`, reason: 'Para tu viaje', wordCount });
const says = (answer: unknown) => (kaiChat = { answer: async (c) => (seen.push(c), answer) });
const start = async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profile);
  return { sub, me };
};
const deckCount = async (sub: string) => Number((await db.execute(sql`select count(*) as n from decks where user_id = ${sub}`)).rows[0]?.n);

test('a turn with three ideas: three proposed decks with their sizes, linked to Kai’s last line; reading the chat shows them', async () => {
  const { sub, me } = await start();
  says({ lines: [{ text: 'Mira', translation: 'Look' }, { text: '3 mazos para ti', translation: '3 decks for you' }], decks: [idea('Ordering food', 12), idea('At the hotel', 20), idea('Small talk', 30)] });
  const turn = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'Quiero palabras nuevas' }));
  kaiChat = fixture;
  expect(turn.messages).toHaveLength(2);
  expect(turn.messages[0]!.decks).toBeUndefined();
  const cards = turn.messages[1]!.decks!;
  expect(cards.map((d) => d.wordCount)).toEqual([12, 20, 30]);
  for (const d of cards) expect(d).toMatchObject({ status: 'proposed', current: true, cefr: 'A2', reason: 'Para tu viaje' });
  expect(cards[0]).toMatchObject({ title: 'Título: Ordering food', titleTranslation: 'Title: Ordering food' });

  expect((await db.execute(sql`select topic, word_count, status, cefr from decks where user_id = ${sub} order by word_count`)).rows).toEqual([
    { topic: 'Ordering food', word_count: 12, status: 'proposed', cefr: 'A2' },
    { topic: 'At the hotel', word_count: 20, status: 'proposed', cefr: 'A2' },
    { topic: 'Small talk', word_count: 30, status: 'proposed', cefr: 'A2' },
  ]);
  const chat = await json<Chat>(me('/v1/kai/chat'));
  expect(chat.messages.map((m) => m.decks?.length ?? 0)).toEqual([0, 0, 3]);
  expect(chat.messages[2]!.decks).toEqual(cards);
  // A proposed deck Kai offered: its size and translation, no cards yet.
  expect(await json<Deck>(me(`/v1/decks/${cards[1]!.id}`))).toMatchObject({ topic: 'At the hotel', wordCount: 20, titleTranslation: 'Title: At the hotel', status: 'proposed', cards: [] });
  const stranger = await call(crypto.randomUUID());
  expect((await stranger(`/v1/decks/${cards[0]!.id}`)).status).toBe(404);
});

test('two ideas or a bad size: 502 and nothing is saved', async () => {
  const { sub, me } = await start();
  for (const bad of [[idea('a', 12), idea('b', 12)], [idea('a', 5)], [idea('a', 40)]]) {
    says({ lines: [{ text: 'a', translation: 'a' }], decks: bad });
    expect((await me('/v1/kai/chat/turns', 'POST', { text: 'ideas' })).status).toBe(502);
  }
  kaiChat = fixture;
  expect(await deckCount(sub)).toBe(0);
  expect((await json<Chat>(me('/v1/kai/chat'))).messages).toEqual([]);
});

test('older ideas are not current after a new set; the status follows the deck; a deck of 24 gets exactly 24 cards', async () => {
  const { me } = await start();
  says({ lines: [{ text: 'uno', translation: 'one' }], decks: [idea('Ordering food', 24), idea('At the hotel', 10), idea('Small talk', 30)] });
  const first = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'ideas' }));
  const big = first.messages[0]!.decks![0]!;

  const ready = await json<Deck>(me(`/v1/decks/${big.id}/generate`, 'POST'));
  expect(ready.status).toBe('ready');
  expect(ready.wordCount).toBe(24);
  expect(ready.cards).toHaveLength(24);
  expect(ready.cards.map((c) => c.position)).toEqual(Array.from({ length: 24 }, (_, i) => i));
  expect(new Set(ready.cards.map((c) => c.word)).size).toBe(24);
  for (const c of ready.cards) expect(c.stage).toBe(0);
  // Generate twice: never more than wordCount cards.
  await me(`/v1/decks/${big.id}/generate`, 'POST');
  expect(Number((await db.execute(sql`select count(*) as n from cards where deck_id = ${big.id}`)).rows[0]?.n)).toBe(24);

  let chat = await json<Chat>(me('/v1/kai/chat'));
  expect(chat.messages.at(-1)!.decks!.map((d) => [d.status, d.current])).toEqual([['ready', true], ['proposed', true], ['proposed', true]]);

  tick();
  says({ lines: [{ text: 'dos', translation: 'two' }], decks: [idea('In a café', 15)] });
  await me('/v1/kai/chat/turns', 'POST', { text: 'otra idea' });
  kaiChat = fixture;
  chat = await json<Chat>(me('/v1/kai/chat'));
  const withCards = chat.messages.filter((m) => m.decks?.length);
  expect(withCards.map((m) => m.decks!.map((d) => d.current))).toEqual([[false, false, false], [true]]);
  expect(withCards[0]!.decks![0]!.status).toBe('ready');
});

test('fewer good cards than the deck size: 502, the deck goes back to proposed with no cards', async () => {
  const { me } = await start();
  says({ lines: [{ text: 'uno', translation: 'one' }], decks: [idea('Ordering food', 24)] });
  const deck = (await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'idea' }))).messages[0]!.decks![0]!;
  kaiChat = fixture;
  deckMaker = { ...fixtureDeckMaker, cards: async (i) => (await fixtureDeckMaker.cards(i)).slice(0, 20) };
  const res = await me(`/v1/decks/${deck.id}/generate`, 'POST');
  deckMaker = fixtureDeckMaker;
  expect(res.status).toBe(502);
  expect(await json<Deck>(me(`/v1/decks/${deck.id}`))).toMatchObject({ status: 'proposed', cards: [] });
});

test('the deck maker is asked for the deck’s own size', async () => {
  const { me } = await start();
  says({ lines: [{ text: 'uno', translation: 'one' }], decks: [idea('Ordering food', 17)] });
  const deck = (await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'idea' }))).messages[0]!.decks![0]!;
  kaiChat = fixture;
  let asked: number | undefined;
  deckMaker = { ...fixtureDeckMaker, cards: async (i) => ((asked = i.wordCount), fixtureDeckMaker.cards(i)) };
  expect((await json<Deck>(me(`/v1/decks/${deck.id}/generate`, 'POST'))).cards).toHaveLength(17);
  deckMaker = fixtureDeckMaker;
  expect(asked).toBe(17);
});

test('an onboarding deck: 10 words and no title translation', async () => {
  const { me } = await start();
  const proposed = await json<Deck>(me('/v1/decks', 'POST', { topic: 'Ordering food' }));
  expect(proposed).toMatchObject({ wordCount: 10, titleTranslation: null, status: 'proposed', cards: [] });
  const ready = await json<Deck>(me(`/v1/decks/${proposed.id}/generate`, 'POST'));
  expect(ready.cards).toHaveLength(10);
  expect(ready.titleTranslation).toBeNull();
});

test('the whole path with the stand-in Kai: ask first, yes, generate, ready event once, practice', async () => {
  const { sub, me } = await start();
  await me('/v1/profile/chat', 'PUT', { name: 'Maya', chatLanguage: 'target' });
  seen = [];
  const opening = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { open: true }));
  expect(opening.messages.every((m) => !m.decks)).toBe(true);
  expect(await deckCount(sub)).toBe(0);
  // What Kai was told about decks: nothing to practice yet, no topics.
  expect(seen[0]!.decks).toEqual({ newWordsLeft: 0, topics: [], offered: [] });

  tick();
  const yes = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: opening.options[0] }));
  const cards = yes.messages.at(-1)!.decks!;
  expect(cards).toHaveLength(3);
  expect(await deckCount(sub)).toBe(3);

  // Not ready yet: 409. Another user's deck: 404.
  expect((await me('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: cards[1]!.id })).status).toBe(409);
  const stranger = await start();
  expect((await stranger.me('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: cards[1]!.id })).status).toBe(404);

  const deck = await json<Deck>(me(`/v1/decks/${cards[1]!.id}/generate`, 'POST'));
  expect(deck.cards).toHaveLength(cards[1]!.wordCount);

  tick();
  seen = [];
  const ready = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: deck.id }));
  expect(ready.userMessage).toBeNull();
  expect(ready.messages.length).toBeGreaterThan(0);
  expect(ready.options).toEqual(['Vamos a practicar', 'Hacer otro mazo']);
  expect(seen[0]).toMatchObject({ event: { deckReady: { title: deck.title, wordCount: deck.wordCount } } });
  // Now Kai knows the topics: the made deck, and the two ideas that were only offered.
  expect(seen[0]!.decks).toMatchObject({ newWordsLeft: deck.wordCount, topics: [deck.topic] });
  expect(seen[0]!.decks!.offered).toHaveLength(2);
  expect(seen[0]!.decks!.offered).not.toContain(deck.topic);

  const before = Number((await db.execute(sql`select count(*) as n from kai_messages where user_id = ${sub}`)).rows[0]?.n);
  tick();
  expect(await json<Turn>(me('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: deck.id }))).toEqual({ userMessage: null, messages: [], options: [], action: null });
  expect(Number((await db.execute(sql`select count(*) as n from kai_messages where user_id = ${sub}`)).rows[0]?.n)).toBe(before);
  expect(seen).toHaveLength(1);

  // The chat after a restart: the cards sit under the line they came with, the made one is ready, and the options are Kai's last.
  const chat = await json<Chat>(me('/v1/kai/chat'));
  const withCards = chat.messages.filter((m) => m.decks?.length);
  expect(withCards).toHaveLength(1);
  expect(withCards[0]!.decks!.map((d) => d.status)).toEqual(['proposed', 'ready', 'proposed']);
  expect(chat.options).toEqual(['Vamos a practicar', 'Hacer otro mazo']);

  tick();
  expect((await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'Vamos a practicar' }))).action).toBe('review');
});

test('two ready events at once: Kai speaks once', async () => {
  const { sub, me } = await start();
  says({ lines: [{ text: 'uno', translation: 'one' }], decks: [idea('Ordering food', 10)] });
  const deck = (await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'idea' }))).messages[0]!.decks![0]!;
  kaiChat = fixture;
  await me(`/v1/decks/${deck.id}/generate`, 'POST');
  tick();
  const before = Number((await db.execute(sql`select count(*) as n from kai_messages where user_id = ${sub}`)).rows[0]?.n);
  const [a, b] = await Promise.all([json<Turn>(me('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: deck.id })), json<Turn>(me('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: deck.id }))]);
  expect([a.messages.length, b.messages.length].filter((n) => n > 0)).toHaveLength(1);
  const after = Number((await db.execute(sql`select count(*) as n from kai_messages where user_id = ${sub}`)).rows[0]?.n);
  expect(after - before).toBe(Math.max(a.messages.length, b.messages.length));
});
