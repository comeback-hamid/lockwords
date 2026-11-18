// The vocabulary engine's scoring model, ported as is from docs/vocab-engine.md section 1.5 (the live funnel code,
// block ESTIMATE-START … ESTIMATE-END). Same constants, same steps. Change nothing here without re-running
// `npm run test:engine` and checking the table in section 1.8.
//
// Number = how many of the 5,000 most common dictionary words (lemmas) the learner recognises (X_Lex scale).
//   P(know k) = 1 / (1 + exp(-EST_A * (theta - ln k)))     theta = ln(the rank known with a 50 % chance)
//   P(tick a real word) = P(know) + (1 - P(know)) * g ;  P(tick a made-up word) = g
//   g = (fk + 1) / (fn + 16)   (made-up words only, so the result is monotone in every tick)
//   theta ~ Normal(ln 1200, 1.5) ; N(theta) = sum over k = 1..5000 of P(know k)
//   result = N(median theta) * (1 - fk / (fn + 2))

export type Page = 'A' | 'B' | 'C' | 'D';
export type VocabItem = { w: string; k?: number; r?: number; fake?: number; rd?: string };
export type Vocab = { pages: Partial<Record<Page, VocabItem[]>> };
export type Known = Partial<Record<Page, string[]>>;

export const EST_A = 1.75;
export const EST_U = 5000;
const EST_GA = 1;
const EST_GB = 15;
const EST_MU = Math.log(1200);
const EST_SD = 1.5;
export const EST_C2_R50 = 20000;
export const EST_VERSION = 4;

const EST_TH: number[] = [];
for (let t = Math.log(10); t <= Math.log(300000) + 1e-9; t += 0.02) EST_TH.push(t);
let EST_NTAB: number[] | null = null;
// N(theta) for every grid point: the expected number of the top 5,000 lemmas known. Made once.
const estN = () =>
  EST_NTAB ??
  (EST_NTAB = EST_TH.map((t) => {
    let s = 0;
    for (let k = 1; k <= EST_U; k++) s += 1 / (1 + Math.exp(-EST_A * (t - Math.log(k))));
    return s;
  }));

export type Estimate = {
  words: number;
  raw: number;
  lo: number;
  hi: number;
  r50: number;
  realKnown: number;
  fakes: number;
  fn: number;
  faRate: number;
  g: number;
  reliable: boolean;
};

// known = the ticked words per page; shown = the pages that were shown.
export function vocabEstimate(vocab: Vocab, known: Known, shown: Page[]): Estimate {
  const xs: number[] = [];
  const ys: boolean[] = [];
  let fn = 0;
  let fk = 0;
  for (const pg of shown) {
    const ks = new Set(known[pg] ?? []);
    for (const it of vocab.pages[pg] ?? []) {
      const y = ks.has(it.w);
      if (it.fake) {
        fn++;
        if (y) fk++;
        continue;
      }
      xs.push(Math.log(it.k || it.r || 1));
      ys.push(y);
    }
  }
  const realKnown = ys.filter(Boolean).length;
  const faRate = fn ? fk / fn : 0;
  const reliable = !(fk >= 3 && faRate >= 0.3); // many made-up words ticked → offer a redo
  if (!realKnown) return { words: 0, raw: 0, lo: 0, hi: 0, r50: 0, realKnown, fakes: fk, fn, faRate, g: 0, reliable };
  const g = (fk + EST_GA) / (fn + EST_GA + EST_GB);
  const lp = EST_TH.map((t) => {
    let ll = -((t - EST_MU) ** 2) / (2 * EST_SD * EST_SD);
    for (let i = 0; i < xs.length; i++) {
      const p = 1 / (1 + Math.exp(-EST_A * (t - xs[i]!)));
      const q = g + (1 - g) * p;
      ll += Math.log(ys[i] ? q : 1 - q);
    }
    return ll;
  });
  const top = Math.max(...lp);
  const w = lp.map((x) => Math.exp(x - top));
  const tot = w.reduce((a, b) => a + b, 0);
  const q = (f: number) => {
    let c = 0;
    for (let i = 0; i < w.length; i++) {
      c += w[i]! / tot;
      if (c >= f) return i;
    }
    return w.length - 1;
  };
  const NT = estN();
  const iMed = q(0.5);
  const pen = 1 - fk / (fn + 2);
  const raw = NT[iMed]! * pen;
  const lo = NT[q(0.1)]! * pen;
  const hi = NT[q(0.9)]! * pen;
  let words = raw >= EST_U - 100 ? EST_U : raw < 1000 ? Math.round(raw / 50) * 50 : Math.round(raw / 100) * 100;
  words = Math.max(50, words); // shown as "5,000+" when words === EST_U
  return {
    words,
    raw: Math.round(raw),
    lo: Math.round(lo),
    hi: Math.round(hi),
    r50: Math.round(Math.exp(EST_TH[iMed]!)),
    realKnown,
    fakes: fk,
    fn,
    faRate,
    g: Math.round(g * 1000) / 1000,
    reliable,
  };
}

// CEFR label (Milton & Alexiou 2009, X_Lex bands). C2 also needs R50 >= 20,000: evidence beyond the top 5,000.
export const cefrOf = (n: number, r50: number, c2 = EST_C2_R50) =>
  n < 1500 ? 'A1' : n < 2500 ? 'A2' : n < 3250 ? 'B1' : n < 3750 ? 'B2' : n < 4500 || !(r50 >= c2) ? 'C1' : 'C2';

// A typed language's AI word pack (pages A, B, C; no made-up words): every word on a page gets the geometric middle of
// its lemma band (A 30–1,000 → 173, B 1,000–2,500 → 1,581, C 2,500–5,000 → 3,536). Only the count per page matters.
const EST_PACK_SPAN = { A: [30, 1000], B: [1000, 2500], C: [2500, 5000] } as const;
export type WordPack = { A: string[]; B: string[]; C: string[] };
export function packVocab(t: WordPack): Vocab {
  const pages: Vocab['pages'] = {};
  for (const pg of ['A', 'B', 'C'] as const) {
    const [lo, hi] = EST_PACK_SPAN[pg];
    const k = Math.round(Math.sqrt(lo * hi));
    pages[pg] = (t[pg] ?? []).map((w) => ({ w, k }));
  }
  return { pages };
}
