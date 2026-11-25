import sharp from 'sharp';
import { expect, test } from 'vitest';

import { createApp, type PicturesStore, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { cutSingle, WORD_PICTURE } from '../../src/decks/cut-sheet.js';
import type { RandomWordsStore } from '../../src/decks/random-words.js';
import { drawWordPictures, inlineWordPictureJobs, type WordPictureJobs } from '../../src/decks/word-pictures.js';
import { fixtureSheetMaker, gridFor, ILLUSTRATION_STYLE, openaiSheetMaker, SINGLE, SINGLE_SIZE, singlePrompt, type Grid, type SheetMaker } from '../../src/llm/deck-pictures.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// The picture of a single word in a "Random Words N" deck: one small image per word, drawn after the word is saved.
const word = { word: 'para llevar', translation: 'to go (takeaway)' };

test('the single picture prompt: the word with its meaning, no text in the picture, the same style as deck pictures', () => {
  const p = singlePrompt(word);
  expect(p).toContain('para llevar (to go (takeaway))');
  expect(p).toContain('No borders, no frames, no numbers, no letters, no words anywhere.');
  expect(p).toContain('Colours: only near-black, white, light gray and green.');
  expect(p).toContain(ILLUSTRATION_STYLE);
  expect(p).not.toContain('grid');
  expect(singlePrompt({ ...word, pictureHint: 'a paper bag with food' })).toContain('a paper bag with food'); // a picture idea wins
});

test('the real image call for one word: one request, the small square size, low quality', async () => {
  const calls: Record<string, unknown>[] = [];
  const png = await sharp({ create: { width: SINGLE_SIZE, height: SINGLE_SIZE, channels: 3, background: '#f6f8fa' } }).png().toBuffer();
  const fakeFetch = (async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const maker = openaiSheetMaker('sk-img', fakeFetch);
  expect((await maker.sheet([word], SINGLE)).equals(png)).toBe(true);
  expect(calls[0]).toMatchObject({ size: `${SINGLE_SIZE}x${SINGLE_SIZE}`, quality: 'low', n: 1, prompt: singlePrompt(word) });
  // A deck sheet is not changed by this.
  await maker.sheet(Array.from({ length: 10 }, () => word), gridFor(10));
  expect(calls[1]).toMatchObject({ size: '1536x1024', quality: 'medium' });
});

test('the stand-in draws one square picture for one word', async () => {
  const meta = await sharp(await fixtureSheetMaker().sheet([word], SINGLE)).metadata();
  expect([meta.width, meta.height]).toEqual([SINGLE_SIZE, SINGLE_SIZE]);
});

test('a single picture is cut to the shape of a deck picture: a small WebP, wider than tall, from the middle', async () => {
  // Top and bottom bands are black, the middle is light: the cut keeps the middle.
  const s = SINGLE_SIZE;
  const image = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" fill="#000"/><rect y="${s * 0.1}" width="${s}" height="${s * 0.8}" fill="#f6f8fa"/></svg>`)).png().toBuffer();
  const cut = await cutSingle(image);
  const meta = await sharp(cut).metadata();
  expect(meta.format).toBe('webp');
  expect([meta.width, meta.height]).toEqual([WORD_PICTURE.width, WORD_PICTURE.height]);
  expect(WORD_PICTURE.width / WORD_PICTURE.height).toBeCloseTo(1.25, 1);
  expect((await sharp(cut).stats()).channels[0]!.mean).toBeGreaterThan(235); // the black bands are gone
});

// An in-memory pictures store for one deck.
function memory(cardIds: string[]) {
  const saved = new Map<string, Buffer>();
  const log: string[] = [];
  const store: PicturesStore = {
    todo: async (_deckId, cardId) => cardIds.filter((id) => !saved.has(id) && (!cardId || id === cardId)).map((id) => ({ cardId: id, word: id, translation: `meaning of ${id}` })),
    save: async (_deckId, pictures) => {
      for (const p of pictures) saved.set(p.cardId, p.data);
    },
    finish: async (_deckId, status) => void log.push(status),
    read: async () => null,
  };
  return { store, saved, log };
}
function countingMaker(inner: SheetMaker = fixtureSheetMaker()) {
  const grids: Grid[] = [];
  const maker: SheetMaker = { sheet: (items, grid) => (grids.push(grid), inner.sheet(items, grid)) };
  return { maker, grids };
}

test('drawing one word: one single image, only that card gets a picture, the deck status is not touched', async () => {
  const m = memory(['a', 'b']);
  const { maker, grids } = countingMaker();
  expect(await drawWordPictures({ pictures: m.store, sheetMaker: maker }, 'deck', 'b')).toBe(true);
  expect(grids).toEqual([SINGLE]);
  expect([...m.saved.keys()]).toEqual(['b']);
  const meta = await sharp(m.saved.get('b')!).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(['webp', WORD_PICTURE.width, WORD_PICTURE.height]);
  expect(m.log).toEqual([]);
});

test('a job that runs twice draws once', async () => {
  const m = memory(['a']);
  const { maker, grids } = countingMaker();
  await drawWordPictures({ pictures: m.store, sheetMaker: maker }, 'deck', 'a');
  expect(await drawWordPictures({ pictures: m.store, sheetMaker: maker }, 'deck', 'a')).toBe(true);
  expect(grids).toHaveLength(1);
});

test('the image model fails fast once → one more try; fails again → false, nothing saved, nothing thrown', async () => {
  const m = memory(['a']);
  let tries = 0;
  const flaky: SheetMaker = { sheet: async (i, g) => (++tries === 1 ? Promise.reject(new Error('busy')) : fixtureSheetMaker().sheet(i, g)) };
  expect(await drawWordPictures({ pictures: m.store, sheetMaker: flaky }, 'deck', 'a')).toBe(true);
  expect(tries).toBe(2);

  const bad = memory(['a']);
  tries = 0;
  expect(await drawWordPictures({ pictures: bad.store, sheetMaker: { sheet: async () => (tries++, Promise.reject(new Error('down'))) } }, 'deck', 'a')).toBe(false);
  expect(tries).toBe(2);
  expect(bad.saved.size).toBe(0);
  // A store that breaks does not throw either.
  const broken: PicturesStore = { ...bad.store, todo: async () => Promise.reject(new Error('db')) };
  expect(await drawWordPictures({ pictures: broken, sheetMaker: fixtureSheetMaker() }, 'deck', 'a')).toBe(false);
});

test('older words (no card named): every word of the deck with no picture, on ONE sheet; one word alone gets a single image', async () => {
  const m = memory(['a', 'b', 'c', 'd', 'e']);
  const { maker, grids } = countingMaker();
  expect(await drawWordPictures({ pictures: m.store, sheetMaker: maker }, 'deck')).toBe(true);
  expect(grids).toEqual([gridFor(5)]);
  expect(m.saved.size).toBe(5);

  const one = memory(['a']);
  const single = countingMaker();
  await drawWordPictures({ pictures: one.store, sheetMaker: single.maker }, 'deck');
  expect(single.grids).toEqual([SINGLE]);

  const none = memory([]);
  const idle = countingMaker();
  expect(await drawWordPictures({ pictures: none.store, sheetMaker: idle.maker }, 'deck')).toBe(true);
  expect(idle.grids).toEqual([]);
});

// ---- The add-word route ----
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const profiles: ProfilesStore = { upsert: async (_u, p) => p, get: async () => null, setChat: async () => true };
const result = { deckId: 'd1', deckTitle: 'Random Words 1', count: 1, already: false };
async function addWord(randomWords: RandomWordsStore, wordPictures?: WordPictureJobs) {
  const t = await makeTestKeys();
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, randomWords, wordPictures });
  return app.request(`/v1/kai/chat/messages/${crypto.randomUUID()}/add-word`, { method: 'POST', headers: { Authorization: `Bearer ${await t.token({ sub: crypto.randomUUID() })}` } });
}

test('adding a word starts its picture and does not wait for it', async () => {
  const started: [string, string | undefined][] = [];
  let finish = () => {};
  const slow: WordPictureJobs = { start: (deckId, cardId) => (started.push([deckId, cardId]), new Promise<void>((r) => (finish = r))) };
  const res = await addWord({ add: async () => ({ ok: true, result, cardId: 'c1' }) }, slow); // answers while the picture is still open
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual(result);
  expect(started).toEqual([['d1', 'c1']]);
  finish();
});

test('a picture job that cannot start keeps the word: the answer is still 200', async () => {
  const res = await addWord({ add: async () => ({ ok: true, result, cardId: 'c1' }) }, { start: async () => Promise.reject(new Error('queue down')) });
  expect(res.status).toBe(200);
  const thrown = await addWord({ add: async () => ({ ok: true, result, cardId: 'c1' }) }, { start: () => { throw new Error('queue down'); } });
  expect(thrown.status).toBe(200);
});

test('no new card (the learner had the word, or the same tap again) starts no picture', async () => {
  let started = 0;
  const jobs: WordPictureJobs = { start: async () => void started++ };
  expect((await addWord({ add: async () => ({ ok: true, result: { ...result, already: true } }) }, jobs)).status).toBe(200);
  expect((await addWord({ add: async () => ({ ok: false, error: 'no_word' }) }, jobs)).status).toBe(409);
  expect(started).toBe(0);
});

test('the inline runner (no queue): start comes back at once, idle waits for the picture', async () => {
  const m = memory(['a']);
  const jobs = inlineWordPictureJobs({ pictures: m.store, sheetMaker: fixtureSheetMaker(30) });
  await jobs.start('deck', 'a');
  expect(m.saved.size).toBe(0);
  await jobs.idle!();
  expect(m.saved.size).toBe(1);
});
