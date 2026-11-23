import { readFileSync } from 'node:fs';

import sharp from 'sharp';
import { expect, test } from 'vitest';

import { createApp, type DecksStore, type PicturesStore, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { inlineDeckJobs, makeDeckCards } from '../../src/decks/jobs.js';
import { drawDeckPictures, type PictureTodo } from '../../src/decks/pictures.js';
import { cutSheet } from '../../src/decks/cut-sheet.js';
import { fixtureSheetMaker, gridFor, ILLUSTRATION_STYLE, openaiSheetMaker, SHEET, sheetPrompt, sheetSizes, type SheetMaker } from '../../src/llm/deck-pictures.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { deckPrompt } from '../../src/llm/make-deck.js';
import type { Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const profile: Profile = { learningLanguage: 'es', nativeLanguage: 'en', level: 'some_basics', knownWords: 1850, cefr: 'A2+', goal: 'travel', goalOther: null, interests: ['food'] };
const items = (n: number): PictureTodo[] => Array.from({ length: n }, (_, i) => ({ cardId: `c${i}`, word: `word ${i}`, translation: `meaning ${i}`, pictureHint: i % 2 ? `a thing number ${i}` : null }));

test('the grid: 10 → 4 × 3, 20 → 5 × 4, 30 → 6 × 5, and one sheet per deck', () => {
  expect(gridFor(10)).toEqual({ cols: 4, rows: 3 });
  expect(gridFor(12)).toEqual({ cols: 4, rows: 3 });
  expect(gridFor(13)).toEqual({ cols: 5, rows: 4 });
  expect(gridFor(20)).toEqual({ cols: 5, rows: 4 });
  expect(gridFor(21)).toEqual({ cols: 6, rows: 5 });
  expect(gridFor(30)).toEqual({ cols: 6, rows: 5 });
  for (const n of [10, 20, 30]) expect(sheetSizes(n)).toEqual([n]);
});

test('the style is the one in docs/design/ILLUSTRATION-STYLE.md, word for word', () => {
  const doc = readFileSync(new URL('../../../../docs/design/ILLUSTRATION-STYLE.md', import.meta.url), 'utf8');
  const [, style, avoid] = doc.split(/\n\s*\n/);
  expect(ILLUSTRATION_STYLE).toBe(`${style!.trim()} ${avoid!.replace(/\*\*/g, '').trim()}`);
});

test('the sheet prompt: grid, every item in order, empty cells, no text, the style', () => {
  const p = sheetPrompt(items(10), gridFor(10));
  expect(p).toContain('an exact grid of 4 columns and 3 rows');
  expect(p).toContain('1. word 0 (meaning 0)');
  expect(p).toContain('2. a thing number 1'); // the hint wins over the word
  expect(p).toContain('10. a thing number 9');
  expect(p).toContain('The last 2 cells stay empty.');
  expect(p).toContain('No grid lines, no borders, no frames, no numbers, no letters, no words anywhere.');
  expect(p).toContain(ILLUSTRATION_STYLE);
  expect(sheetPrompt(items(30), gridFor(30))).not.toContain('stay empty');
});

test('the words prompt asks for a picture idea in English with every word', () => {
  expect(deckPrompt({ ...profile, cefr: 'A2+', topic: 'Ordering food' })).toContain('- picture: what to draw for this word, in English, at most 12 words');
});

// A sheet whose cell i is filled with its own gray: 10 * (i + 1).
async function graySheet(cols: number, rows: number) {
  const w = SHEET.width / cols, h = SHEET.height / rows;
  const rects = Array.from({ length: cols * rows }, (_, i) => `<rect x="${(i % cols) * w}" y="${Math.floor(i / cols) * h}" width="${w}" height="${h}" fill="rgb(${10 * (i + 1)},${10 * (i + 1)},${10 * (i + 1)})"/>`).join('');
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET.width}" height="${SHEET.height}">${rects}</svg>`)).png().toBuffer();
}

test('cutting: one WebP picture per item, in reading order, each from its own cell', async () => {
  const pictures = await cutSheet(await graySheet(4, 3), { cols: 4, rows: 3 }, 10);
  expect(pictures).toHaveLength(10);
  for (const [i, picture] of pictures.entries()) {
    const meta = await sharp(picture).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(384);
    expect(meta.height).toBe(341);
    const { channels } = await sharp(picture).stats();
    expect(Math.abs(channels[0]!.mean - 10 * (i + 1))).toBeLessThan(3);
  }
});

test('a sheet in another size than asked is still cut by its own size', async () => {
  const small = await sharp(await graySheet(4, 3)).resize(768, 512).png().toBuffer();
  const pictures = await cutSheet(small, { cols: 4, rows: 3 }, 10);
  expect((await sharp(pictures[9]!).metadata()).width).toBe(192);
});

test('the real image call: one request, landscape sheet, medium quality; a bad answer throws', async () => {
  const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const png = await graySheet(4, 3);
  const fakeFetch = (status: number) =>
    (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify(status === 200 ? { data: [{ b64_json: png.toString('base64') }] } : { error: { message: 'no' } }), { status });
    }) as unknown as typeof fetch;
  const sheet = await openaiSheetMaker('sk-img', fakeFetch(200)).sheet(items(10), gridFor(10));
  expect(sheet.equals(png)).toBe(true);
  expect(calls[0]!.url).toBe('https://api.openai.com/v1/images/generations');
  expect(calls[0]!.headers.Authorization).toBe('Bearer sk-img');
  expect(calls[0]!.body).toMatchObject({ size: '1536x1024', quality: 'medium', n: 1 });
  expect(calls[0]!.body.prompt).toBe(sheetPrompt(items(10), gridFor(10)));
  await expect(openaiSheetMaker('k', fakeFetch(500)).sheet(items(10), gridFor(10))).rejects.toThrow();
});

test('the stand-in sheet is a real picture of the right size', async () => {
  const meta = await sharp(await fixtureSheetMaker().sheet(items(10), gridFor(10))).metadata();
  expect([meta.width, meta.height]).toEqual([SHEET.width, SHEET.height]);
});

// An in-memory pictures store.
function memory(n: number) {
  const todo = items(n);
  const saved = new Map<string, Buffer>();
  const log: string[] = [];
  const store: PicturesStore = {
    todo: async () => todo.filter((t) => !saved.has(t.cardId)),
    save: async (_deckId, pictures) => {
      for (const p of pictures) saved.set(p.cardId, p.data);
      log.push(`save ${pictures.length}`);
    },
    finish: async (_deckId, status) => void log.push(status),
    read: async () => null,
  };
  return { store, saved, log };
}
const okMaker: SheetMaker = { sheet: async (_items, grid) => graySheet(grid.cols, grid.rows) };

test('drawing: one sheet, a picture for every card, then ready', async () => {
  const m = memory(20);
  let sheets = 0;
  await drawDeckPictures({ pictures: m.store, sheetMaker: { sheet: (i, g) => (sheets++, okMaker.sheet(i, g)) } }, 'deck');
  expect(sheets).toBe(1);
  expect(m.saved.size).toBe(20);
  expect(m.log).toEqual(['save 20', 'ready']);
  // card 7 got cell 7
  expect(Math.abs((await sharp(m.saved.get('c7')!).stats()).channels[0]!.mean - 80)).toBeLessThan(3);
});

test('drawing fails fast once → one more try; fails again → "failed", nothing thrown, nothing saved', async () => {
  const m = memory(10);
  let tries = 0;
  await drawDeckPictures({ pictures: m.store, sheetMaker: { sheet: async (i, g) => (++tries === 1 ? Promise.reject(new Error('busy')) : okMaker.sheet(i, g)) } }, 'deck');
  expect(tries).toBe(2);
  expect(m.log).toEqual(['save 10', 'ready']);

  const bad = memory(10);
  tries = 0;
  await expect(drawDeckPictures({ pictures: bad.store, sheetMaker: { sheet: async () => (tries++, Promise.reject(new Error('down'))) } }, 'deck')).resolves.toBeUndefined();
  expect(tries).toBe(2);
  expect(bad.log).toEqual(['failed']);
});

test('a slow failure is not tried again (the learner already waited)', async () => {
  const m = memory(10);
  let tries = 0, clock = 0;
  await drawDeckPictures({ pictures: m.store, sheetMaker: { sheet: async () => (tries++, (clock += 30_000), Promise.reject(new Error('timeout'))) }, now: () => clock }, 'deck');
  expect(tries).toBe(1);
  expect(m.log).toEqual(['failed']);
});

test('nothing to draw (every card has its picture) → ready, no image call', async () => {
  const m = memory(0);
  let tries = 0;
  await drawDeckPictures({ pictures: m.store, sheetMaker: { sheet: async () => (tries++, graySheet(4, 3)) } }, 'deck');
  expect(tries).toBe(0);
  expect(m.log).toEqual(['ready']);
});

// ---- The deck job and the routes ----
type Deck = Awaited<ReturnType<DecksStore['create']>>;
function fakeDecks() {
  const rows = new Map<string, Deck>();
  const withPictures: boolean[] = [];
  const store: DecksStore = {
    create: async (_u, d) => {
      const deck: Deck = { ...d, id: crypto.randomUUID(), wordCount: 10, status: 'proposed', cards: [] };
      rows.set(deck.id, deck);
      return deck;
    },
    get: async (_u, id) => rows.get(id) ?? null,
    saveCards: async (id, cards, pictures) => {
      withPictures.push(!!pictures);
      const d = rows.get(id)!;
      d.cards = cards.map((c, i) => ({ ...c, id: `c${i}`, position: i, stage: 0 }));
      d.status = 'ready';
      d.picturesStatus = pictures ? 'making' : 'none';
      d.picturesReady = 0;
      return d;
    },
  };
  return { store, rows, withPictures };
}
const profiles: ProfilesStore = { upsert: async (_u, p) => p, get: async () => profile, setChat: async () => true };
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };

test('the words job marks the deck "pictures are being made" only when pictures can be drawn', async () => {
  const a = fakeDecks();
  const { id } = await a.store.create('u', { topic: 'Ordering food', title: 't', reason: 'r', cefr: 'A1' });
  expect(await makeDeckCards({ profiles, decks: a.store, deckMaker: fixtureDeckMaker }, 'u', id)).toBe(true);
  expect(a.withPictures).toEqual([false]);

  const b = fakeDecks();
  const deck = await b.store.create('u', { topic: 'Ordering food', title: 't', reason: 'r', cefr: 'A1' });
  const m = memory(10);
  expect(await makeDeckCards({ profiles, decks: b.store, deckMaker: fixtureDeckMaker, pictures: m.store, sheetMaker: okMaker }, 'u', deck.id)).toBe(true);
  expect(b.withPictures).toEqual([true]);
});

test('a failed picture run does not lose the deck: the words are saved and the deck is ready', async () => {
  const d = fakeDecks();
  const deck = await d.store.create('u', { topic: 'Ordering food', title: 't', reason: 'r', cefr: 'A1' });
  const m = memory(10);
  const jobs = inlineDeckJobs({ profiles, decks: d.store, deckMaker: fixtureDeckMaker, pictures: m.store, sheetMaker: { sheet: async () => Promise.reject(new Error('down')) } });
  expect(await jobs.start('u', deck.id)).toBe('ready');
  await jobs.idle?.();
  expect(d.rows.get(deck.id)).toMatchObject({ status: 'ready' });
  expect(d.rows.get(deck.id)!.cards).toHaveLength(10);
  expect(m.log).toEqual(['failed']);
});

test('the deck answer: imageUrl is a full address, or left out; pictures status and count; the picture itself is served without a login', async () => {
  const t = await makeTestKeys();
  const pictureId = crypto.randomUUID();
  const webp = await sharp(await graySheet(1, 1)).resize(40, 30).webp().toBuffer();
  const deck: Deck = {
    id: crypto.randomUUID(), topic: 'Food', title: 'Food', reason: 'r', cefr: 'A1', wordCount: 10, status: 'ready', picturesStatus: 'making', picturesReady: 1,
    cards: [
      { id: 'c0', position: 0, stage: 0, word: 'a', translation: 'b', example: 'c', exampleTranslation: 'd', imageUrl: `/pictures/${pictureId}` },
      { id: 'c1', position: 1, stage: 0, word: 'e', translation: 'f', example: 'g', exampleTranslation: 'h' },
    ],
  };
  const decks: DecksStore = { create: async () => deck, get: async () => deck, saveCards: async () => deck };
  const pictures: PicturesStore = { todo: async () => [], save: async () => {}, finish: async () => {}, read: async (id) => (id === pictureId ? webp : null) };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, decks, pictures });
  const res = await app.request(`http://api.test/v1/decks/${deck.id}`, { headers: { Authorization: `Bearer ${await t.token()}`, 'x-forwarded-proto': 'https' } });
  const body = (await res.json()) as Deck;
  expect(body).toMatchObject({ picturesStatus: 'making', picturesReady: 1 });
  expect(body.cards[0]!.imageUrl).toBe(`https://api.test/pictures/${pictureId}`);
  expect('imageUrl' in body.cards[1]!).toBe(false);

  const picture = await app.request(`/pictures/${pictureId}`); // no token
  expect(picture.status).toBe(200);
  expect(picture.headers.get('content-type')).toBe('image/webp');
  expect(picture.headers.get('cache-control')).toContain('immutable');
  expect(Buffer.from(await picture.arrayBuffer()).equals(webp)).toBe(true);
  expect((await app.request(`/pictures/${crypto.randomUUID()}`)).status).toBe(404);
  expect((await app.request('/pictures/not-an-id')).status).toBe(404);
});

test('a deck from an older store (no picture fields) answers "none", 0 and no imageUrl', async () => {
  const t = await makeTestKeys();
  const deck: Deck = { id: crypto.randomUUID(), topic: 'Food', title: 'Food', reason: 'r', cefr: 'A1', wordCount: 10, status: 'ready', cards: [{ id: 'c0', position: 0, stage: 0, word: 'a', translation: 'b', example: 'c', exampleTranslation: 'd' }] };
  const decks: DecksStore = { create: async () => deck, get: async () => deck, saveCards: async () => deck };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, decks });
  const body = (await (await app.request(`/v1/decks/${deck.id}`, { headers: { Authorization: `Bearer ${await t.token()}` } })).json()) as Deck;
  expect(body).toMatchObject({ picturesStatus: 'none', picturesReady: 0 });
  expect(body.cards[0]!.imageUrl).toBeUndefined();
});
