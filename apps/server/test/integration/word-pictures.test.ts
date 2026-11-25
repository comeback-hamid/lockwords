import { sql } from 'drizzle-orm';
import { PgBoss } from 'pg-boss';
import sharp from 'sharp';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createKaiStore } from '../../src/db/kai.js';
import { createPicturesStore, missingWordPictures } from '../../src/db/pictures.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { WORD_PICTURE } from '../../src/decks/cut-sheet.js';
import { createRandomWordsStore } from '../../src/decks/random-words.js';
import { createQueuedWordPictureJobs } from '../../src/decks/word-pictures.js';
import { loadEnv } from '../../src/env.js';
import { fixtureSheetMaker, type SheetMaker } from '../../src/llm/deck-pictures.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { fixtureKaiChat, type KaiChat } from '../../src/llm/kai-chat.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// Pictures for single words, and the 30-word rule of "Random Words N", on the real database and the real queue.
// The image model is the stand-in.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const boss = new PgBoss(env.DATABASE_URL);
const pictures = createPicturesStore(db);
let sheetMaker: SheetMaker = fixtureSheetMaker();
let sheets = 0;
let now = new Date('2026-11-25T10:00:00Z');
let kaiChat: KaiChat = fixtureKaiChat;
type Call = (path: string, method?: string, body?: unknown) => Promise<Response>;
let call: (sub: string) => Promise<Call>;
let jobs: Awaited<ReturnType<typeof createQueuedWordPictureJobs>>;

beforeAll(async () => {
  await boss.start();
  jobs = await createQueuedWordPictureJobs(boss, { pictures, sheetMaker: { sheet: (i, g) => (sheets++, sheetMaker.sheet(i, g)) } });
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
        wordPictures: jobs,
        pictures,
        kaiChat: { answer: (c) => kaiChat.answer(c) },
        kaiNow: () => now,
      }).request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
}, 30_000);
afterAll(async () => {
  await boss.stop();
  await pool.end();
});

const profile = { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] };
type Card = { id: string; word: string; position: number; imageUrl?: string | null };
type Deck = { id: string; title: string; kind: string; wordCount: number; picturesStatus?: string; cards: Card[] };
type Message = { id: string; word?: { word: string; addTo: string } };
type Added = { deckId: string; deckTitle: string; count: number; already: boolean };
const json = async <T>(r: Promise<Response>) => (await (await r).json()) as T;

async function learner() {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profile);
  const ask = async (w: string) => {
    kaiChat = { answer: async () => ({ lines: [{ text: `Se dice **${w}**`, translation: `You say ${w}` }], word: { word: w, translation: `${w} in English`, example: `Una frase con **${w}**.`, exampleTranslation: `A sentence with ${w}.` } }) };
    now = new Date(now.getTime() + 1000);
    const turn = await json<{ messages: Message[] }>(me('/v1/kai/chat/turns', 'POST', { text: `How do I say ${w}?` }));
    kaiChat = fixtureKaiChat;
    return turn.messages.at(-1)!;
  };
  const add = (messageId: string) => json<Added>(me(`/v1/kai/chat/messages/${messageId}/add-word`, 'POST'));
  const keep = async (w: string) => add((await ask(w)).id);
  const read = (id: string) => json<Deck>(me(`/v1/decks/${id}`));
  // Fills a deck with plain cards, the fast way.
  const fill = (deckId: string, from: number, to: number) =>
    db.execute(sql`insert into cards (deck_id, position, word, translation, example, example_translation) select ${deckId}::uuid, g, ${`relleno ${deckId.slice(0, 4)} `} || g, 't', 'e', 'et' from generate_series(${from}::int, ${to}::int) g`);
  const titles = async () => ((await db.execute(sql`select title, removed_at is not null as removed, (select count(*)::int from cards c where c.deck_id = d.id and c.removed_at is null) as n from decks d where user_id = ${sub} and kind = 'random' order by title`)).rows as { title: string; removed: boolean; n: number }[]).map((d) => `${d.title}: ${d.n}${d.removed ? ' (removed)' : ''}`);
  return { sub, me, ask, add, keep, read, fill, titles };
}
// Waits until the deck's card `word` has a picture.
async function pictured(read: (id: string) => Promise<Deck>, deckId: string, word: string) {
  for (let i = 0; i < 100; i++) {
    const card = (await read(deckId)).cards.find((c) => c.word === word);
    if (card?.imageUrl) return card;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`"${word}" never got a picture`);
}

// ---- Pictures ----

test('a kept word is saved at once and gets its own picture a moment later, in the deck and in Review', async () => {
  sheetMaker = fixtureSheetMaker(1500); // a slow image model
  const { me, keep, read } = await learner();
  const started = Date.now();
  const added = await keep('para llevar');
  expect(Date.now() - started).toBeLessThan(1500); // the add did not wait for the picture
  expect(added).toEqual({ deckId: expect.any(String), deckTitle: 'Random Words 1', count: 1, already: false });
  const before = await read(added.deckId);
  expect(before.cards.map((c) => c.word)).toEqual(['para llevar']);
  expect(before.cards[0]!.imageUrl ?? null).toBeNull();

  const card = await pictured(read, added.deckId, 'para llevar');
  expect(card.imageUrl).toMatch(/\/pictures\/[0-9a-f-]{36}$/);
  const res = await me(new URL(card.imageUrl!).pathname);
  expect(res.headers.get('content-type')).toBe('image/webp');
  const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
  expect([meta.width, meta.height]).toEqual([WORD_PICTURE.width, WORD_PICTURE.height]);
  const round = await json<{ cards: Card[] }>(me('/v1/review'));
  expect(round.cards.find((c) => c.id === card.id)?.imageUrl).toBe(card.imageUrl);
  // The deck does not say "pictures are being made": that is only for a deck Kai generates.
  expect((await read(added.deckId)).picturesStatus ?? 'none').toBe('none');
  sheetMaker = fixtureSheetMaker();
}, 60_000);

test('each word gets its own picture; the same tap again draws nothing more', async () => {
  const { ask, add, read } = await learner();
  const first = await ask('izquierda');
  const { deckId } = await add(first.id);
  await add((await ask('derecha')).id);
  const a = await pictured(read, deckId, 'izquierda');
  const b = await pictured(read, deckId, 'derecha');
  expect(a.imageUrl).not.toBe(b.imageUrl);
  const drawn = sheets;
  await add(first.id);
  await new Promise((r) => setTimeout(r, 1500));
  expect(sheets).toBe(drawn);
  expect((await read(deckId)).cards.find((c) => c.word === 'izquierda')!.imageUrl).toBe(a.imageUrl);
}, 60_000);

test('the image model is down: the word stays, with no picture; the next word still gets one', async () => {
  const { keep, read } = await learner();
  sheetMaker = { sheet: async () => Promise.reject(new Error('down')) };
  const before = sheets;
  const added = await keep('la cuenta');
  for (let i = 0; i < 50 && sheets < before + 2; i++) await new Promise((r) => setTimeout(r, 100)); // one try, one more
  expect(sheets).toBe(before + 2);
  sheetMaker = fixtureSheetMaker();
  const deck = await read(added.deckId);
  expect(deck.cards.map((c) => c.word)).toEqual(['la cuenta']);
  expect(deck.cards[0]!.imageUrl ?? null).toBeNull();
  await keep('la propina');
  await pictured(read, added.deckId, 'la propina');
  expect((await read(added.deckId)).cards.find((c) => c.word === 'la cuenta')!.imageUrl ?? null).toBeNull(); // only its own word
}, 60_000);

test('older words: the list names Random Words decks with words that have no picture, and one job per deck draws them on one sheet', async () => {
  const { sub, me, keep, read, fill } = await learner();
  const { deckId } = await keep('uno');
  await pictured(read, deckId, 'uno');
  await fill(deckId, 1, 6); // six older words with no picture
  const removed = (await read(deckId)).cards.at(-1)!;
  expect((await me(`/v1/cards/${removed.id}`, 'DELETE')).status).toBe(204);
  // A deck Kai generated with no pictures is not on the list (not in scope).
  const topic = await json<{ id: string }>(me('/v1/decks', 'POST', { topic: 'Ordering food' }));
  await me(`/v1/decks/${topic.id}/generate`, 'POST');
  // A removed Random Words deck is not on it either.
  const other = await learner();
  const gone = await other.keep('dos');
  await pictured(other.read, gone.deckId, 'dos');
  await other.fill(gone.deckId, 1, 3);
  expect((await other.me(`/v1/decks/${gone.deckId}`, 'DELETE')).status).toBe(204);

  const mine = async () => (await missingWordPictures(db)).filter((d) => d.userId === sub || d.userId === other.sub);
  expect(await mine()).toEqual([{ deckId, userId: sub, words: 5 }]);

  const before = sheets;
  await jobs.start(deckId);
  for (const card of (await read(deckId)).cards) await pictured(read, deckId, card.word);
  expect(sheets).toBe(before + 1); // five words, one sheet
  expect(await mine()).toEqual([]);
  expect(new Set((await read(deckId)).cards.map((c) => c.imageUrl)).size).toBe(6);
  // Again: nothing left to draw.
  await jobs.start(deckId);
  await new Promise((r) => setTimeout(r, 1500));
  expect(sheets).toBe(before + 1);
}, 60_000);

// ---- The 30 rule ----

test('30 words fill a deck: word 31 starts "Random Words 2", word 61 starts "Random Words 3"', async () => {
  const { ask, keep, fill, titles } = await learner();
  const one = await keep('palabra 1');
  await fill(one.deckId, 1, 28);
  expect(await keep('palabra 30')).toMatchObject({ deckId: one.deckId, deckTitle: 'Random Words 1', count: 30 });
  expect((await ask('otra')).word!.addTo).toBe('Random Words 2');
  const two = await keep('palabra 31');
  expect(two).toMatchObject({ deckTitle: 'Random Words 2', count: 1 });
  await fill(two.deckId, 1, 29);
  expect((await ask('otra más')).word!.addTo).toBe('Random Words 3');
  expect(await keep('palabra 61')).toMatchObject({ deckTitle: 'Random Words 3', count: 1 });
  expect(await keep('palabra 62')).toMatchObject({ deckTitle: 'Random Words 3', count: 2 });
  expect(await titles()).toEqual(['Random Words 1: 30', 'Random Words 2: 30', 'Random Words 3: 2']);
}, 60_000);

test('a removed word frees its place: with decks 1 and 2 full, the next word goes to the deck that lost a word, never past 30', async () => {
  const { me, keep, read, fill, titles } = await learner();
  const one = await keep('a 1');
  await fill(one.deckId, 1, 29);
  const two = await keep('b 1');
  await fill(two.deckId, 1, 29);
  expect(await titles()).toEqual(['Random Words 1: 30', 'Random Words 2: 30']);
  expect((await me(`/v1/cards/${(await read(one.deckId)).cards[3]!.id}`, 'DELETE')).status).toBe(204);
  expect(await keep('nueva')).toEqual({ deckId: one.deckId, deckTitle: 'Random Words 1', count: 30, already: false });
  expect((await read(one.deckId)).cards.at(-1)!.word).toBe('nueva');
  // Both full again: the next one starts deck 3.
  expect(await keep('otra nueva')).toMatchObject({ deckTitle: 'Random Words 3', count: 1 });
  expect(await titles()).toEqual(['Random Words 1: 30', 'Random Words 2: 30', 'Random Words 3: 1']);
}, 60_000);

test('a number is never used again: after "Random Words 2" is removed the next new deck is "Random Words 3"', async () => {
  const { me, keep, fill, titles } = await learner();
  const one = await keep('a 1');
  await fill(one.deckId, 1, 29);
  const two = await keep('b 1');
  expect((await me(`/v1/decks/${two.deckId}`, 'DELETE')).status).toBe(204);
  const three = await keep('c 1');
  expect(three).toMatchObject({ deckTitle: 'Random Words 3', count: 1 });
  expect(three.deckId).not.toBe(two.deckId);
  expect(await titles()).toEqual(['Random Words 1: 30', 'Random Words 2: 0 (removed)', 'Random Words 3: 1']);
}, 60_000);

test('31 adds at the same moment: 30 in "Random Words 1", 1 in "Random Words 2"', async () => {
  const { ask, add, titles } = await learner();
  const messages: Message[] = [];
  for (let i = 0; i < 31; i++) messages.push(await ask(`junta ${i}`));
  const results = await Promise.all(messages.map((m) => add(m.id)));
  expect(results.filter((r) => r.deckTitle === 'Random Words 1')).toHaveLength(30);
  expect(results.filter((r) => r.deckTitle === 'Random Words 2')).toHaveLength(1);
  expect(await titles()).toEqual(['Random Words 1: 30', 'Random Words 2: 1']);
}, 120_000);
