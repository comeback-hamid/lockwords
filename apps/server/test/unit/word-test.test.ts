import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type UsersStore } from '../../src/app.js';
import { cefrOf, packVocab, vocabEstimate } from '../../src/onboarding/estimate.js';
import { ENGINE_LANGUAGES, nextPage, scoreTest, shownPages, vocabFor, type Known, type Vocab } from '../../src/onboarding/word-test.js';
import type { WordPackMaker } from '../../src/llm/word-pack.js';
import type { WordTestStore } from '../../src/onboarding/word-test-store.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// Expected numbers come from docs/vocab-engine.md section 1.8, checked against the live funnel code on 2026-11-17.
const en = vocabFor('en')!;
// Real words ordered by form rank (the engine's test harness does the same), and the made-up words.
const real = (v: Vocab, pg: keyof Vocab['pages']) => (v.pages[pg] ?? []).filter((x) => !x.fake).sort((a, b) => (a.r ?? a.k ?? 0) - (b.r ?? b.k ?? 0)).map((x) => x.w);
const fakes = (v: Vocab, pg: keyof Vocab['pages']) => (v.pages[pg] ?? []).filter((x) => x.fake).map((x) => x.w);
const A = real(en, 'A'), B = real(en, 'B'), C = real(en, 'C'), D = real(en, 'D');
const result = (known: Known) => { const r = scoreTest(en, known); return [r.words, r.cefr]; };

test('data: 13 languages, 4 pages of 20 real + 3 made-up words, every real word has an integer rank', () => {
  expect(ENGINE_LANGUAGES).toHaveLength(13);
  for (const code of ENGINE_LANGUAGES) {
    const v = vocabFor(code)!;
    for (const pg of ['A', 'B', 'C', 'D'] as const) {
      const items = v.pages[pg] ?? [];
      expect(items.filter((x) => !x.fake)).toHaveLength(20);
      expect(items.filter((x) => x.fake)).toHaveLength(3);
      expect(new Set(items.map((x) => x.w)).size).toBe(23);
      for (const x of items.filter((i) => !i.fake)) expect(Number.isInteger(x.k) && x.k! >= 1).toBe(true);
      if (code === 'ja' || code === 'zh') for (const x of items) expect(x.rd).toBeTruthy();
    }
  }
});

test('a language is found by code or by English name; others are not', () => {
  expect(vocabFor('Spanish')).toBe(vocabFor('es'));
  expect(vocabFor(' japanese ')).toBe(vocabFor('ja'));
  expect(vocabFor('Swedish')).toBeNull();
});

test('engine table 1.8 (English)', () => {
  expect(result({ A: A.slice(0, 5), B: [] })).toEqual([200, 'A1']);
  expect(result({ A, B: [] })).toEqual([1100, 'A1']);
  expect(result({ A, B, C: [] })).toEqual([3500, 'B2']);
  expect(result({ A, B: B.slice(0, 19), C: C.slice(0, 14) })).toEqual([4700, 'C1']);
  expect(result({ A: [...A, fakes(en, 'A')[0]!], B: B.slice(0, 19), C: C.slice(0, 14) })).toEqual([4200, 'C1']);
  expect(result({ A: [...A, fakes(en, 'A')[0]!], B: B.slice(0, 19), C: [...C.slice(0, 14), fakes(en, 'C')[0]!] })).toEqual([3800, 'C1']);
  const top = scoreTest(en, { A, B, C, D: D.slice(0, 12) });
  expect([top.words, top.plus, top.cefr]).toEqual([5000, true, 'C2']);
});

test('C2 needs proof beyond the top 5,000; a native speaker is C2 in all 13 languages', () => {
  const rarestD = (en.pages.D ?? []).filter((x) => !x.fake).sort((a, b) => b.k! - a.k!).slice(0, 9).map((x) => x.w);
  expect(result({ A, B, C: C.slice(0, 16), D: rarestD })).toEqual([4800, 'C1']);
  for (const code of ENGINE_LANGUAGES) {
    const v = vocabFor(code)!;
    const r = scoreTest(v, { A: real(v, 'A'), B: real(v, 'B'), C: real(v, 'C'), D: real(v, 'D') });
    expect([code, r.words, r.cefr]).toEqual([code, 5000, 'C2']);
  }
});

test('label edges', () => {
  expect([1450, 1500, 2500, 3250, 3750].map((n) => cefrOf(n, 0))).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
  expect(cefrOf(4600, 19999)).toBe('C1');
  expect(cefrOf(4600, 20000)).toBe('C2');
});

test('nothing known, unknown words, made-up words only → starting fresh', () => {
  for (const known of [{ A: [], B: [] }, { A: ['not-a-word'], B: [] }, { A: fakes(en, 'A'), B: [] }]) {
    const r = scoreTest(en, known);
    expect([r.words, r.startingFresh]).toEqual([0, true]);
  }
});

test('guessing: many made-up words ticked → not reliable; one is fine', () => {
  const all = (pg: 'A' | 'B' | 'C' | 'D') => (en.pages[pg] ?? []).map((x) => x.w);
  expect(scoreTest(en, { A: all('A'), B: all('B'), C: all('C'), D: all('D') }).reliable).toBe(false);
  expect(scoreTest(en, { A: [...A.slice(0, 10), ...fakes(en, 'A')], B: [...B.slice(0, 10), ...fakes(en, 'B')] }).reliable).toBe(false);
  const one = scoreTest(en, { A: [...A, fakes(en, 'A')[0]!], B: B.slice(0, 5) });
  expect([one.reliable, one.fakesTicked]).toEqual([true, 1]);
});

test('next page: C after 4+ real B words, D after 15+ real C words; made-up words do not count', () => {
  expect(nextPage(en, { A, B: B.slice(0, 3) })).toBeNull();
  expect(nextPage(en, { A, B: [...B.slice(0, 3), ...fakes(en, 'B')] })).toBeNull();
  expect(nextPage(en, { A, B: B.slice(0, 4) })).toBe('C');
  expect(nextPage(en, { A, B, C: C.slice(0, 15) })).toBe('D');
  expect(nextPage(en, { A, B, C: C.slice(0, 14) })).toBeNull();
  expect(nextPage(en, { A, B, C, D })).toBeNull();
  // A page the rule did not show is never scored.
  expect(shownPages(en, { A, B: B.slice(0, 2), C: C, D })).toEqual(['A', 'B']);
});

test('invariants (300 random answer sets): more real ticks never lower, more made-up ticks never raise, same answers same result', () => {
  let seed = 4242;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pages = ['A', 'B', 'C', 'D'] as const;
  for (let t = 0; t < 300; t++) {
    const known: Record<string, string[]> = {};
    for (const p of pages) {
      const share = rnd();
      known[p] = real(en, p).filter(() => rnd() < share);
      if (rnd() < 0.3) known[p] = [...known[p]!, fakes(en, p)[0]!];
    }
    const base = vocabEstimate(en, known, [...pages]);
    expect(vocabEstimate(en, known, [...pages])).toEqual(base);
    for (const p of pages) {
      const missing = real(en, p).filter((w) => !known[p]!.includes(w));
      if (missing.length && base.realKnown > 0) expect(vocabEstimate(en, { ...known, [p]: [...known[p]!, missing[0]!] }, [...pages]).raw).toBeGreaterThanOrEqual(base.raw);
      const fake = fakes(en, p).find((w) => !known[p]!.includes(w));
      if (fake && base.realKnown > 0) expect(vocabEstimate(en, { ...known, [p]: [...known[p]!, fake] }, [...pages]).raw).toBeLessThanOrEqual(base.raw);
    }
  }
});

test('typed-language pack: only the count per page matters', () => {
  const words = (p: string) => Array.from({ length: 20 }, (_, i) => `${p}${i}`);
  const pack = packVocab({ A: words('a'), B: words('b'), C: words('c') });
  const allA = scoreTest(pack, { A: words('a'), B: [] });
  expect([allA.words, allA.cefr]).toEqual([850, 'A1']);
  const ab = scoreTest(pack, { A: words('a'), B: words('b'), C: [] });
  expect([ab.words, ab.cefr]).toEqual([2600, 'B1']);
  expect(scoreTest(pack, { A: words('a').slice(12), B: [] }).words).toBe(scoreTest(pack, { A: words('a').slice(0, 8), B: [] }).words);
  expect(nextPage(pack, { A: words('a'), B: words('b'), C: words('c') })).toBeNull(); // packs have no page D
});

test('saved ticks: 1 or 0 for every item of every shown page, in file order', () => {
  const r = scoreTest(en, { A: [en.pages.A![0]!.w], B: [] });
  expect(r.pages).toEqual(['A', 'B']);
  expect(r.ticks).toBe(`A:1${'0'.repeat(22)},B:${'0'.repeat(23)}`);
});

// ---------- routes ----------
type Saved = Parameters<WordTestStore['saveResult']>[0];
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let packs: Map<string, { A: string[]; B: string[]; C: string[] }>;
let results: Saved[];
let makerCalls: number;
let maker: WordPackMaker;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const store: WordTestStore = {
  getPack: async (language) => packs.get(language) ?? null,
  savePack: async (language, pack) => void (packs.has(language) || packs.set(language, pack)),
  saveResult: async (row) => void results.push(row),
};
const words20 = (p: string) => Array.from({ length: 20 }, (_, i) => `${p}-${i}`);

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(() => {
  packs = new Map();
  results = [];
  makerCalls = 0;
  maker = { make: async () => (makerCalls++, { A: words20('sv-a'), B: words20('sv-b'), C: words20('sv-c') }) };
});
const as = async (sub: string) => {
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, wordTests: store, wordPackMaker: maker });
  const headers = { Authorization: `Bearer ${await t.token({ sub })}`, 'Content-Type': 'application/json' };
  return (path: string, body?: unknown) => app.request(path, body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) });
};
type Pages = Record<string, { w: string; rd?: string }[]>;

test('GET /v1/word-test: 4 pages of 23 words, no rank or made-up flag, same order for the same user', async () => {
  const alice = await as(crypto.randomUUID());
  const res = await alice('/v1/word-test?language=es');
  expect(res.status).toBe(200);
  const body = (await res.json()) as { supported: boolean; madeUp: boolean; pages: Pages };
  expect([body.supported, body.madeUp]).toEqual([true, true]);
  expect(Object.keys(body.pages)).toEqual(['A', 'B', 'C', 'D']);
  for (const items of Object.values(body.pages)) {
    expect(items).toHaveLength(23);
    for (const item of items) expect(Object.keys(item)).toEqual(['w']);
  }
  expect(await (await alice('/v1/word-test?language=es')).json()).toEqual(body);
  const bob = await as(crypto.randomUUID());
  expect(((await (await bob('/v1/word-test?language=es')).json()) as { pages: Pages }).pages.A).not.toEqual(body.pages.A);
  const ja = (await (await alice('/v1/word-test?language=ja')).json()) as { pages: Pages };
  expect(ja.pages.A!.every((x) => x.rd)).toBe(true);
});

test('GET /v1/word-test: a typed language gets an AI pack once, kept for everyone', async () => {
  const first = (await (await (await as(crypto.randomUUID()))('/v1/word-test?language=Swedish')).json()) as { supported: boolean; madeUp: boolean; pages: Pages };
  expect([first.supported, first.madeUp]).toEqual([true, false]);
  expect(Object.keys(first.pages)).toEqual(['A', 'B', 'C']);
  expect(first.pages.A).toHaveLength(20);
  await (await as(crypto.randomUUID()))('/v1/word-test?language=swedish');
  expect(makerCalls).toBe(1);
});

test('GET /v1/word-test: the AI pack fails → not supported; missing language → 400', async () => {
  maker = { make: async () => null };
  const me = await as(crypto.randomUUID());
  expect(await (await me('/v1/word-test?language=Klingonish')).json()).toEqual({ supported: false, madeUp: false, pages: {} });
  expect((await me('/v1/word-test')).status).toBe(400);
  expect((await me('/v1/word-test?language=')).status).toBe(400);
});

test('POST /v1/word-test/next', async () => {
  const me = await as(crypto.randomUUID());
  const next = async (known: Known) => ((await (await me('/v1/word-test/next', { language: 'en', known })).json()) as { next: string | null }).next;
  expect(await next({ A, B: B.slice(0, 3) })).toBeNull();
  expect(await next({ A, B: B.slice(0, 4) })).toBe('C');
  expect(await next({ A, B, C: C.slice(0, 15) })).toBe('D');
  expect((await me('/v1/word-test/next', { language: 'Klingonish', known: { A: [], B: [] } })).status).toBe(400);
});

test('POST /v1/word-test/estimate answers the result and saves one row each time', async () => {
  const sub = crypto.randomUUID();
  const me = await as(sub);
  const res = await me('/v1/word-test/estimate', { language: 'en', known: { A, B: B.slice(0, 19), C: C.slice(0, 14) } });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ words: 4700, outOf: 5000, plus: false, cefr: 'C1', startingFresh: false, reliable: true, fakesTicked: 0 });
  await me('/v1/word-test/estimate', { language: 'en', known: { A: [], B: [] } });
  expect(results).toHaveLength(2);
  expect(results[0]).toMatchObject({ userId: sub, language: 'en', version: 4, words: 4700, pages: 'ABC', reliable: true });
  expect(results[0]!.ticks.split(',').map((p) => p.length)).toEqual([25, 25, 25]);
  expect((await me('/v1/word-test/estimate', { language: 'Klingonish', known: { A: [], B: [] } })).status).toBe(400);
});
