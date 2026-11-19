import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createKaiStore } from '../../src/db/kai.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { createRandomWordsStore } from '../../src/decks/random-words.js';
import { loadEnv } from '../../src/env.js';
import { fixtureDeckMaker, fixtureUseItJudge } from '../../src/llm/fixture.js';
import { fixtureKaiChat, type KaiChat } from '../../src/llm/kai-chat.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// Removing words and decks on the real database: the two routes, and every reader that must skip removed rows.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const kai = createKaiStore(db);
let now = new Date('2026-11-19T10:00:00Z');
let kaiChat: KaiChat = fixtureKaiChat;
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
        useItJudge: fixtureUseItJudge,
        kai,
        randomWords: createRandomWordsStore(db),
        kaiChat: { answer: (c) => kaiChat.answer(c) },
        kaiNow: () => now,
      }).request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
});
afterAll(() => pool.end());

const profile = { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] };
type Card = { id: string; word: string; position: number; stage: number };
type Deck = { id: string; title: string; kind: string; status: string; wordCount: number; cards: Card[] };
type ChatDeck = { id: string; status: string };
type Message = { id: string; from: string; text: string; decks?: ChatDeck[]; word?: { word: string; addTo: string; added: boolean; already: boolean } };
type Turn = { userMessage: Message | null; messages: Message[] };
type Added = { deckId: string; deckTitle: string; count: number; already: boolean };
const json = async <T>(r: Promise<Response>) => (await (await r).json()) as T;
const tick = () => (now = new Date(now.getTime() + 1000));
const round = async (me: Call) => (await json<{ cards: { id: string; word: string }[] }>(me('/v1/review'))).cards;

// A new user with a profile. `deck` makes a ready deck of 10. `ask` makes a Kai turn that carries the word `w`.
async function learner() {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profile);
  const deck = async (topic = 'Ordering food') => {
    const made = await json<{ id: string }>(me('/v1/decks', 'POST', { topic }));
    return json<Deck>(me(`/v1/decks/${made.id}/generate`, 'POST'));
  };
  const read = (id: string) => json<Deck>(me(`/v1/decks/${id}`));
  const ask = async (w: string) => {
    kaiChat = { answer: async () => ({ lines: [{ text: `Se dice **${w}**`, translation: `You say ${w}` }], word: { word: w, translation: `${w} in English`, example: `Una frase con **${w}**.`, exampleTranslation: `A sentence with ${w}.` } }) };
    tick();
    const turn = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: `How do I say ${w}?` }));
    kaiChat = fixtureKaiChat;
    return turn.messages.at(-1)!;
  };
  const add = (messageId: string) => json<Added>(me(`/v1/kai/chat/messages/${messageId}/add-word`, 'POST'));
  return { sub, me, deck, read, ask, add };
}

test('remove a card: 204, the deck has 9 cards and wordCount 9, the round has 9; a second time is 404', async () => {
  const { me, deck, read } = await learner();
  const d = await deck();
  expect(d.cards).toHaveLength(10);
  const gone = d.cards[3]!;
  const res = await me(`/v1/cards/${gone.id}`, 'DELETE');
  expect(res.status).toBe(204);
  expect(await res.text()).toBe('');
  const after = await read(d.id);
  expect(after.cards).toHaveLength(9);
  expect(after.wordCount).toBe(9);
  expect(after.cards.map((c) => c.id)).not.toContain(gone.id);
  const cards = await round(me);
  expect(cards).toHaveLength(9);
  expect(cards.map((c) => c.id)).not.toContain(gone.id);
  expect((await me(`/v1/cards/${gone.id}`, 'DELETE')).status).toBe(404);
  expect((await read(d.id)).wordCount).toBe(9);
});

test('remove a card: another user, an unknown id and a malformed id are 404 and nothing changes', async () => {
  const { me, deck, read } = await learner();
  const d = await deck();
  const stranger = await call(crypto.randomUUID());
  expect((await stranger(`/v1/cards/${d.cards[0]!.id}`, 'DELETE')).status).toBe(404);
  expect((await me(`/v1/cards/${crypto.randomUUID()}`, 'DELETE')).status).toBe(404);
  expect((await me('/v1/cards/not-an-id', 'DELETE')).status).toBe(404);
  expect((await read(d.id)).cards).toHaveLength(10);
});

test('a removed card: swipe and Use it answer 404, and it leaves the hard words', async () => {
  const { me, deck } = await learner();
  const d = await deck();
  const card = d.cards[1]!;
  await me(`/v1/cards/${card.id}/swipe`, 'POST', { direction: 'hard' });
  expect((await json<{ words: { word: string }[] }>(me('/v1/hard-words'))).words.map((w) => w.word)).toEqual([card.word]);
  expect((await me(`/v1/cards/${card.id}`, 'DELETE')).status).toBe(204);
  expect((await json<{ words: unknown[] }>(me('/v1/hard-words'))).words).toEqual([]);
  expect((await me(`/v1/cards/${card.id}/swipe`, 'POST', { direction: 'easy' })).status).toBe(404);
  expect((await me(`/v1/cards/${card.id}/use-it`, 'POST', { sentence: `Una frase con ${card.word}.` })).status).toBe(404);
});

test('a removed card that was due does not come back in a round', async () => {
  const { me, deck } = await learner();
  const d = await deck();
  const card = d.cards[0]!;
  await me(`/v1/cards/${card.id}/swipe`, 'POST', { direction: 'easy' });
  await db.execute(sql`update cards set due_at = now() - interval '1 hour' where id = ${card.id}`);
  expect((await round(me))[0]!.id).toBe(card.id);
  await me(`/v1/cards/${card.id}`, 'DELETE');
  expect((await round(me)).map((c) => c.id)).not.toContain(card.id);
});

test('remove a deck: 204, then read, generate and a second removal are 404; the round and hard words are empty', async () => {
  const { sub, me, deck } = await learner();
  const d = await deck();
  await me(`/v1/cards/${d.cards[0]!.id}/swipe`, 'POST', { direction: 'hard' });
  const res = await me(`/v1/decks/${d.id}`, 'DELETE');
  expect(res.status).toBe(204);
  expect((await me(`/v1/decks/${d.id}`)).status).toBe(404);
  expect((await me(`/v1/decks/${d.id}/generate`, 'POST')).status).toBe(404);
  expect((await me(`/v1/decks/${d.id}`, 'DELETE')).status).toBe(404);
  expect(await round(me)).toEqual([]);
  expect((await json<{ words: unknown[] }>(me('/v1/hard-words'))).words).toEqual([]);
  expect((await me(`/v1/cards/${d.cards[1]!.id}/swipe`, 'POST', { direction: 'easy' })).status).toBe(404);
  expect((await me(`/v1/cards/${d.cards[1]!.id}`, 'DELETE')).status).toBe(404);
  // A mark, not a delete: the rows are still there.
  expect(Number((await db.execute(sql`select count(*) as n from cards c join decks d on d.id = c.deck_id where d.user_id = ${sub} and c.removed_at is not null and d.removed_at is not null`)).rows[0]?.n)).toBe(10);
});

test('remove a deck: another user and an unknown id are 404; the owner still has the deck', async () => {
  const { me, deck, read } = await learner();
  const d = await deck();
  const stranger = await call(crypto.randomUUID());
  expect((await stranger(`/v1/decks/${d.id}`, 'DELETE')).status).toBe(404);
  expect((await me(`/v1/decks/${crypto.randomUUID()}`, 'DELETE')).status).toBe(404);
  expect((await me('/v1/decks/not-an-id', 'DELETE')).status).toBe(404);
  expect((await read(d.id)).cards).toHaveLength(10);
  expect(await round(me)).toHaveLength(10);
});

test('a deck that is being made cannot be removed: 409, and it is still there', async () => {
  const { me } = await learner();
  const made = await json<{ id: string }>(me('/v1/decks', 'POST', { topic: 'At the hotel' }));
  await db.execute(sql`update decks set status = 'generating' where id = ${made.id}`);
  const res = await me(`/v1/decks/${made.id}`, 'DELETE');
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: 'deck_generating' });
  expect((await me(`/v1/decks/${made.id}`)).status).toBe(200);
});

test('a proposed deck (an idea) can be removed; generate then answers 404', async () => {
  const { me } = await learner();
  const made = await json<{ id: string }>(me('/v1/decks', 'POST', { topic: 'At the hotel' }));
  expect((await me(`/v1/decks/${made.id}`, 'DELETE')).status).toBe(204);
  expect((await me(`/v1/decks/${made.id}/generate`, 'POST')).status).toBe(404);
});

test('Random Words: a full deck that lost a word has room again, and the new card comes last', async () => {
  const { sub, me, ask, add, read } = await learner();
  const first = await add((await ask('uno')).id);
  // Fill the deck to 30 by hand.
  await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) select ${first.deckId}, g, 'palabra ' || g, 'word', 'e', 'e' from generate_series(1, 29) g`);
  const full = await read(first.deckId);
  expect(full.cards).toHaveLength(30);
  expect((await me(`/v1/cards/${full.cards[4]!.id}`, 'DELETE')).status).toBe(204);
  expect((await read(first.deckId)).wordCount).toBe(29);
  // The next word card names the deck with room.
  const message = await ask('treinta');
  expect(message.word!.addTo).toBe('Random Words 1');
  const added = await add(message.id);
  expect(added).toEqual({ deckId: first.deckId, deckTitle: 'Random Words 1', count: 30, already: false });
  const after = await read(first.deckId);
  expect(after.cards).toHaveLength(30);
  expect(after.cards.at(-1)!.word).toBe('treinta');
  expect(new Set(after.cards.map((c) => c.position)).size).toBe(30);
  expect(Number((await db.execute(sql`select count(*) as n from decks where user_id = ${sub} and kind = 'random'`)).rows[0]?.n)).toBe(1);
});

test('Random Words: after the deck is removed the next word starts "Random Words 2"', async () => {
  const { me, ask, add, read } = await learner();
  const first = await add((await ask('uno')).id);
  expect((await me(`/v1/decks/${first.deckId}`, 'DELETE')).status).toBe(204);
  const message = await ask('dos');
  expect(message.word!.addTo).toBe('Random Words 2');
  const second = await add(message.id);
  expect(second).toMatchObject({ deckTitle: 'Random Words 2', count: 1, already: false });
  expect(second.deckId).not.toBe(first.deckId);
  expect((await read(second.deckId)).cards.map((c) => c.word)).toEqual(['dos']);
});

test('a removed word can be added again from a new word card; a word of a removed deck too', async () => {
  const { me, ask, add, read } = await learner();
  const first = await add((await ask('el paraguas')).id);
  const [card] = (await read(first.deckId)).cards;
  await me(`/v1/cards/${card!.id}`, 'DELETE');
  const again = await add((await ask('El Paraguas')).id);
  expect(again).toMatchObject({ deckId: first.deckId, count: 1, already: false });
  // And a word of a removed topic deck.
  const { me: me2, deck, ask: ask2, add: add2 } = await learner();
  const d = await deck();
  await me2(`/v1/decks/${d.id}`, 'DELETE');
  expect((await add2((await ask2(d.cards[0]!.word)).id)).already).toBe(false);
});

test('the chat: a removed deck is left out of its message, the message stays, and "deck ready" answers 404', async () => {
  const { me } = await learner();
  tick();
  const turn = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'Quiero ver sugerencias' }));
  const shown = turn.messages.at(-1)!;
  expect(shown.decks).toHaveLength(3);
  const chosen = shown.decks![0]!;
  await me(`/v1/decks/${chosen.id}/generate`, 'POST');
  expect((await me(`/v1/decks/${chosen.id}`, 'DELETE')).status).toBe(204);
  const res = await me('/v1/kai/chat');
  expect(res.status).toBe(200);
  const message = (await json<{ messages: Message[] }>(Promise.resolve(res))).messages.find((m) => m.id === shown.id)!;
  expect(message.text).toBe(shown.text);
  expect((message.decks ?? []).map((d) => d.id)).toEqual([shown.decks![1]!.id, shown.decks![2]!.id]);
  tick();
  expect((await me('/v1/kai/chat/turns', 'POST', { event: 'deck_ready', deckId: chosen.id })).status).toBe(404);
  // All three removed: the message has no decks and the chat still loads.
  await me(`/v1/decks/${shown.decks![1]!.id}`, 'DELETE');
  await me(`/v1/decks/${shown.decks![2]!.id}`, 'DELETE');
  const empty = (await json<{ messages: Message[] }>(me('/v1/kai/chat'))).messages.find((m) => m.id === shown.id)!;
  expect(empty.decks ?? []).toEqual([]);
});

test("Kai's facts skip removed cards and removed decks", async () => {
  const { sub, me, deck } = await learner();
  const d = await deck('Ordering food');
  const other = await deck('At the hotel');
  const before = await kai.facts(sub, new Date());
  expect(before.words.total).toBe(20);
  expect(before.decks!.topics.sort()).toEqual(['At the hotel', 'Ordering food']);
  // Practice one card, then remove it and two more.
  await me(`/v1/cards/${d.cards[0]!.id}/swipe`, 'POST', { direction: 'easy' });
  for (const c of d.cards.slice(0, 3)) await me(`/v1/cards/${c.id}`, 'DELETE');
  await me(`/v1/decks/${other.id}`, 'DELETE');
  const facts = await kai.facts(sub, new Date(Date.now() + 1000));
  expect(facts.words.total).toBe(7);
  expect(facts.words.reviewedLastDay).toBe(0);
  expect(facts.words.dueNow).toBe(7);
  expect(facts.decks!.newWordsLeft).toBe(7);
  expect(facts.decks!.topics).toEqual(['Ordering food']);
  const removed = d.cards.slice(0, 3).map((c) => c.word);
  expect(facts.words.sample.map((s) => s.word).filter((w) => removed.includes(w))).toEqual([]);
  expect(facts.words.sample).toHaveLength(7);
});

test('a removed idea is not in the ideas Kai is told it offered', async () => {
  const { sub, me } = await learner();
  const made = await json<{ id: string }>(me('/v1/decks', 'POST', { topic: 'Seeing a doctor' }));
  expect((await kai.facts(sub, new Date())).decks!.offered).toEqual(['Seeing a doctor']);
  await me(`/v1/decks/${made.id}`, 'DELETE');
  expect((await kai.facts(sub, new Date())).decks!.offered).toEqual([]);
});
