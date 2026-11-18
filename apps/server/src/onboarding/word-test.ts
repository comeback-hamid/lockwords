// Word test for onboarding (O4–O7), following docs/vocab-engine.md.
// Word files: src/onboarding/vocab/<code>.json (from the funnel, FrequencyWords by Hermit Dave, CC BY-SA 4.0).
// Each page has 20 real words (k = lemma frequency rank) and 3 made-up words. The app never sees k or the made-up flag.
import { readFileSync } from 'node:fs';

import { cefrOf, EST_U, vocabEstimate, type Known, type Page, type Vocab } from './estimate.js';

export type { Known, Page, Vocab } from './estimate.js';

export const ENGINE_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'fa', 'tr', 'ja', 'zh', 'ko'] as const;
const NAMES: Record<string, string> = {
  english: 'en', spanish: 'es', español: 'es', espanol: 'es', french: 'fr', german: 'de', italian: 'it', portuguese: 'pt',
  russian: 'ru', arabic: 'ar', persian: 'fa', farsi: 'fa', turkish: 'tr', japanese: 'ja', chinese: 'zh', mandarin: 'zh', korean: 'ko',
};

const files = new Map<string, Vocab>();
for (const code of ENGINE_LANGUAGES) {
  files.set(code, JSON.parse(readFileSync(new URL(`./vocab/${code}.json`, import.meta.url), 'utf8')) as Vocab);
}

// A listed language by code ("es") or English name ("Spanish"). Null for any other language (it may get an AI pack).
export function vocabFor(language: string): Vocab | null {
  const key = language.trim().toLowerCase();
  return files.get(NAMES[key] ?? key) ?? null;
}
export const isEngineLanguage = (language: string) => vocabFor(language) !== null;
// The key an AI pack is stored under: the typed name, trimmed and in lower case.
export const packKey = (language: string) => language.trim().toLowerCase();

const knownReal = (vocab: Vocab, known: Known, pg: Page) => {
  const ks = new Set(known[pg] ?? []);
  return (vocab.pages[pg] ?? []).filter((it) => !it.fake && ks.has(it.w)).length;
};
const skipC = (vocab: Vocab, known: Known) => knownReal(vocab, known, 'B') <= 3;
const showD = (vocab: Vocab, known: Known) => !skipC(vocab, known) && (vocab.pages.D ?? []).length > 0 && knownReal(vocab, known, 'C') >= 15;

// The pages that the rules show for these answers (engine 1.4). Only these are scored.
export const shownPages = (vocab: Vocab, known: Known): Page[] => ['A', 'B', ...(skipC(vocab, known) ? [] : ['C' as const]), ...(showD(vocab, known) ? ['D' as const] : [])];

// After page B (no C answers yet): C or the end. After page C: D or the end.
export function nextPage(vocab: Vocab, known: Known): 'C' | 'D' | null {
  if (known.C === undefined) return skipC(vocab, known) ? null : 'C';
  if (known.D === undefined) return showD(vocab, known) ? 'D' : null;
  return null;
}

export function scoreTest(vocab: Vocab, known: Known) {
  const pages = shownPages(vocab, known);
  const r = vocabEstimate(vocab, known, pages);
  // For tuning later (engine 1.12): 1 or 0 for every item of every shown page, in file order.
  const ticks = pages
    .map((pg) => {
      const ks = new Set(known[pg] ?? []);
      return `${pg}:${(vocab.pages[pg] ?? []).map((it) => (ks.has(it.w) ? '1' : '0')).join('')}`;
    })
    .join(',');
  return {
    ...r,
    plus: r.words === EST_U,
    cefr: cefrOf(r.words, r.r50),
    startingFresh: r.realKnown === 0,
    fakesTicked: r.fakes,
    pages,
    ticks,
  };
}

// The pages as the app gets them: words (and readings) only, in an order fixed per user (engine 1.2).
export function publicPages(vocab: Vocab, seedText: string) {
  const out: Partial<Record<Page, { w: string; rd?: string }[]>> = {};
  for (const pg of ['A', 'B', 'C', 'D'] as const) {
    const items = vocab.pages[pg];
    if (!items?.length) continue;
    out[pg] = shuffle(items, `${seedText}:${pg}`).map((it) => (it.rd ? { w: it.w, rd: it.rd } : { w: it.w }));
  }
  return out;
}

// Fisher–Yates with a small seeded generator (FNV-1a hash → mulberry32).
function shuffle<T>(list: T[], seedText: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  let a = h >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
