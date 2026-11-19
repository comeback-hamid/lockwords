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
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { fixtureKaiChat, type KaiChat } from '../../src/llm/kai-chat.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let now = new Date('2026-11-18T10:00:00Z');
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
        kai: createKaiStore(db),
        randomWords: createRandomWordsStore(db),
        kaiChat: { answer: (c) => kaiChat.answer(c) },
        kaiNow: () => now,
      }).request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
});
afterAll(() => pool.end());

const profile = { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] };
type Word = { word: string; translation: string; example: string; exampleTranslation: string; addTo: string; added: boolean; already: boolean };
type Message = { id: string; from: string; text: string; word?: Word };
type Turn = { userMessage: Message | null; messages: Message[] };
type Added = { deckId: string; deckTitle: string; count: number; already: boolean };
type Deck = { id: string; kind: string; title: string; status: string; wordCount: number; cefr: string; cards: { word: string; translation: string; example: string; exampleTranslation: string; stage: number; position: number }[] };
const json = async <T>(r: Promise<Response>) => (await (await r).json()) as T;
const wordOf = (w: string) => ({ word: w, translation: `${w} in English`, example: `Una frase con **${w}**.`, exampleTranslation: `A sentence with ${w}.` });
// A new user with a profile. `ask` makes one Kai turn whose answer carries the word `w`, and gives the message that holds it.
async function learner() {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profile);
  const ask = async (w: string) => {
    kaiChat = { answer: async () => ({ lines: [{ text: 'Mira:', translation: 'Look:' }, { text: `Se dice **${w}**`, translation: `You say ${w}` }], word: wordOf(w) }) };
    now = new Date(now.getTime() + 1000);
    const turn = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: `How do I say ${w}?` }));
    kaiChat = fixtureKaiChat;
    return turn.messages.at(-1)!;
  };
  const add = (id: string) => me(`/v1/kai/chat/messages/${id}/add-word`, 'POST');
  return { sub, me, ask, add };
}
const randomDecks = async (sub: string) => (await db.execute(sql`select d.id, d.title, d.kind, d.status, d.cefr, (select count(*)::int from cards c where c.deck_id = d.id) as n from decks d where d.user_id = ${sub} and d.kind = 'random' order by d.created_at, d.title`)).rows as { id: string; title: string; kind: string; status: string; cefr: string; n: number }[];

test('how do I say: the word is saved with the last Kai line, with addTo and added, and is still there after a restart', async () => {
  const { me } = await learner();
  now = new Date(now.getTime() + 1000);
  const turn = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'How do I say "to go" for food?' }));
  expect(turn.messages.at(-1)!.word).toEqual({ word: 'para llevar', translation: 'to go (takeaway)', example: 'Un café **para llevar**, por favor.', exampleTranslation: 'A coffee to go, please.', addTo: 'Random Words 1', added: false, already: false });
  expect('word' in turn.userMessage!).toBe(false);
  const chat = await json<{ messages: Message[] }>(me('/v1/kai/chat'));
  expect(chat.messages.at(-1)).toEqual(turn.messages.at(-1));
  expect(chat.messages.filter((m) => m.word)).toHaveLength(1);
  // A turn with no word has none.
  now = new Date(now.getTime() + 1000);
  const plain = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'Hola' }));
  expect(plain.messages.every((m) => !('word' in m))).toBe(true);
});

test('a word on a turn with more lines sits on the last line only', async () => {
  const { me, ask } = await learner();
  const last = await ask('la propina');
  const chat = await json<{ messages: Message[] }>(me('/v1/kai/chat'));
  expect(chat.messages.map((m) => Boolean(m.word))).toEqual([false, false, true]);
  expect(chat.messages.at(-1)!.id).toBe(last.id);
});

test('a word with a missing field: the turn fails and nothing is saved', async () => {
  const { sub, me } = await learner();
  kaiChat = { answer: async () => ({ lines: [{ text: 'Se dice…', translation: 'You say…' }], word: { word: 'para llevar', translation: 'to go', exampleTranslation: 'x' } }) };
  expect((await me('/v1/kai/chat/turns', 'POST', { text: 'How do I say to go?' })).status).toBe(502);
  kaiChat = fixtureKaiChat;
  expect(Number((await db.execute(sql`select count(*) as n from kai_messages where user_id = ${sub}`)).rows[0]?.n)).toBe(0);
});

test('first word: "Random Words 1" is made with that one card; adding the same message again changes nothing', async () => {
  const { sub, me, ask, add } = await learner();
  const message = await ask('para llevar');
  const res = await add(message.id);
  expect(res.status).toBe(200);
  const first = (await res.json()) as Added;
  expect(first).toEqual({ deckId: expect.any(String), deckTitle: 'Random Words 1', count: 1, already: false });
  expect(await randomDecks(sub)).toEqual([{ id: first.deckId, title: 'Random Words 1', kind: 'random', status: 'ready', cefr: 'A2', n: 1 }]);

  // Read it like any deck: kind, title, the real number of words, a normal new card with a plain example.
  const deck = await json<Deck>(me(`/v1/decks/${first.deckId}`));
  expect(deck).toMatchObject({ kind: 'random', title: 'Random Words 1', status: 'ready', wordCount: 1 });
  expect(deck.cards).toEqual([{ id: expect.any(String), position: 0, word: 'para llevar', translation: 'para llevar in English', example: 'Una frase con para llevar.', exampleTranslation: 'A sentence with para llevar.', stage: 0 }]);

  // Twice: the same answer, still one copy.
  expect(await json<Added>(add(message.id))).toEqual(first);
  expect((await randomDecks(sub))[0]!.n).toBe(1);

  // The chat shows it as added, also after a restart; the next word would go to the same deck.
  const chat = await json<{ messages: Message[] }>(me('/v1/kai/chat'));
  expect(chat.messages.at(-1)!.word).toMatchObject({ added: true, already: false, addTo: 'Random Words 1' });
  expect((await ask('la cuenta')).word).toMatchObject({ added: false, addTo: 'Random Words 1' });
});

test('cards come back in the order they were added', async () => {
  const { me, ask, add } = await learner();
  let deckId = '';
  for (const w of ['uno', 'dos', 'tres']) deckId = (await json<Added>(add((await ask(w)).id))).deckId;
  const deck = await json<Deck>(me(`/v1/decks/${deckId}`));
  expect(deck.cards.map((c) => c.word)).toEqual(['uno', 'dos', 'tres']);
  expect(deck.wordCount).toBe(3);
});

test('already known: a word the user has in another deck (capital letters ignored) is not added', async () => {
  const { sub, me, ask, add } = await learner();
  const made = await json<{ id: string }>(me('/v1/decks', 'POST', { topic: 'Ordering food' }));
  const topic = await json<Deck>(me(`/v1/decks/${made.id}/generate`, 'POST'));
  expect(topic.kind).toBe('topic');
  const known = topic.cards[0]!.word;
  const message = await ask(known.toUpperCase());
  const result = await json<Added>(add(message.id));
  expect(result).toEqual({ deckId: made.id, deckTitle: topic.title, count: 10, already: true });
  expect(await randomDecks(sub)).toEqual([]);
  const chat = await json<{ messages: Message[] }>(me('/v1/kai/chat'));
  expect(chat.messages.at(-1)!.word).toMatchObject({ added: false, already: true });
  // The same word asked again and added again: still one copy, in Random Words too.
  const first = await ask('la sobremesa');
  expect((await json<Added>(add(first.id))).already).toBe(false);
  const again = await ask('La Sobremesa');
  expect(await json<Added>(add(again.id))).toMatchObject({ deckTitle: 'Random Words 1', count: 1, already: true });
});

test('no word is 409; another user’s message and an unknown id are 404', async () => {
  const { me, ask, add } = await learner();
  now = new Date(now.getTime() + 1000);
  const plain = await json<Turn>(me('/v1/kai/chat/turns', 'POST', { text: 'Hola' }));
  const noWord = await add(plain.messages.at(-1)!.id);
  expect(noWord.status).toBe(409);
  expect(await noWord.json()).toEqual({ error: 'no_word' });
  expect((await add(plain.userMessage!.id)).status).toBe(409);
  const mine = await ask('la mesa');
  const stranger = await learner();
  const res = await stranger.add(mine.id);
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: 'not_found' });
  expect((await add(crypto.randomUUID())).status).toBe(404);
  expect(await randomDecks(stranger.sub)).toEqual([]);
});

test('full deck: the 31st word starts "Random Words 2" and "Random Words 1" keeps 30', async () => {
  const { sub, me, ask, add } = await learner();
  const first = await json<Added>(add((await ask('palabra 0')).id));
  // Fill deck 1 up to 30 the fast way.
  await db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) select ${first.deckId}::uuid, g, 'palabra ' || g, 't', 'e', 'et' from generate_series(1, 29) g`);
  const next = await ask('palabra 30');
  expect(next.word!.addTo).toBe('Random Words 2');
  const second = await json<Added>(add(next.id));
  expect(second).toMatchObject({ deckTitle: 'Random Words 2', count: 1, already: false });
  expect(second.deckId).not.toBe(first.deckId);
  expect((await randomDecks(sub)).map((d) => [d.title, d.n])).toEqual([['Random Words 1', 30], ['Random Words 2', 1]]);
  // The next one joins deck 2.
  expect(await json<Added>(add((await ask('palabra 31')).id))).toMatchObject({ deckTitle: 'Random Words 2', count: 2 });
  expect((await json<Deck>(me(`/v1/decks/${first.deckId}`))).wordCount).toBe(30);
});

test('two adds at once: one deck "Random Words 1" with both cards', async () => {
  const { sub, ask, add } = await learner();
  const a = await ask('izquierda');
  const b = await ask('derecha');
  const [ra, rb] = await Promise.all([json<Added>(add(a.id)), json<Added>(add(b.id))]);
  expect(ra.deckId).toBe(rb.deckId);
  expect([ra.count, rb.count].sort()).toEqual([1, 2]);
  expect((await randomDecks(sub)).map((d) => [d.title, d.n])).toEqual([['Random Words 1', 2]]);
  // The same message twice at once: one card.
  const c = await ask('arriba');
  const [rc, rd] = await Promise.all([json<Added>(add(c.id)), json<Added>(add(c.id))]);
  expect(rc).toEqual(rd);
  expect((await randomDecks(sub))[0]!.n).toBe(3);
});

test('in Review: with no other new words, today’s round has the added word', async () => {
  const { me, ask, add } = await learner();
  expect((await json<{ cards: unknown[] }>(me('/v1/review'))).cards).toEqual([]);
  await add((await ask('el billete')).id);
  const round = await json<{ cards: { word: string; stage: number }[] }>(me('/v1/review'));
  expect(round.cards).toMatchObject([{ word: 'el billete', stage: 0 }]);
});
