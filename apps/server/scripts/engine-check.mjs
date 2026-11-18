// The vocabulary engine's full check, run on OUR port (src/onboarding/estimate.ts) and our word files.
// Copied from the funnel's tools/test-estimate.mjs on 2026-11-17; only the imports and file paths changed.
// Usage: npm run test:engine (about 40 s; exit 1 if a must-pass target fails). See docs/vocab-engine.md 1.11.
// Tests the word-test estimate v4 (the ESTIMATE-START..END block of index.html) on the real vocab files.
// Usage: node tools/test-estimate.mjs [codes...] [--sim=N] [--quick] [--sigma=0.5] [--slopes=1.5,2,2.5] [--g=0.05] [--kx=1]
//   (--sigma / --slopes / --g / --kx change the synthetic learners of section 5; default: a mix, see there)
//   1. data: every real item has an integer lemma rank k >= 1 (vocab/<code>.json, unit "lemma", U 5000); learner-list
//      caps (tools/lemma/learner_caps.json) applied
//   2. calibration profiles P1-P19 (spec section 7 + P19 C2 guard) with must-pass targets per language; 2b. ja / zh
//      textbook learner; 2c. en B2–C1 learner with 9 academic D words must not be C2
//   3. invariants: one more real tick never lowers the result, one more made-up tick never raises it,
//      same answers -> same output, < 5 ms per call, 0 real ticks -> 0
//   4. Phase 2 design (lemma-band pages, 5 fakes each): profiles within one rounding step; recovery of simulated
//      learners under 4 truth models (ideal / realistic word-noise / flatter / steeper) on the Phase 2 design (4b) and on
//      the real pages (4c)
//   4d. over-claimers (report only): unknown real words ticked more often than made-up words; person-fit flag share
//   5. synthetic learners on the real pages: true lemma vocabulary 100-15,000, Rasch-type knowledge curve over
//      ln(lemma rank) with word-level noise and a yes-bias; bias and error per size band and language (report only)
//   6. typed-language word packs (packVocab): order does not matter, levels
// Exit 1 if a must-pass target (1-4, 6) fails. Section 5 only reports.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
import { vocabEstimate, cefrOf, packVocab, EST_U, EST_A, EST_C2_R50 } from '../src/onboarding/estimate.ts';
const argv = process.argv.slice(2), opt = k => (argv.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1];
const QUICK = argv.includes('--quick'), SIM_N = Number(opt('sim')) || (QUICK ? 60 : 200);
const ALL = 'en,de,fr,es,pt,it,ru,ar,fa,tr,ja,zh,ko'.split(',');
const codes = argv.filter(a => !a.startsWith('--')).length ? argv.filter(a => !a.startsWith('--')) : ALL;
const V = Object.fromEntries(codes.map(c => [c, JSON.parse(fs.readFileSync(path.join(here, '..', 'src', 'onboarding', 'vocab', c + '.json'), 'utf8'))]));
const CAPS = JSON.parse(fs.readFileSync(path.join(here, 'engine-data', 'learner_caps.json'), 'utf8'));
const fails = [];
const fail = msg => { fails.push(msg); return false; };
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// Park-Miller generator (same as the spec's measurements)
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- helpers: words ordered by form rank r (as the old harness), pages shown by the funnel rules ----------
const real = (v, pg) => (v.pages[pg] || []).filter(x => !x.fake).sort((a, b) => (a.r || a.k) - (b.r || b.k));
const fk = (v, pg) => (v.pages[pg] || []).filter(x => x.fake).map(x => x.w);
const W = a => a.map(x => x.w);
// Phase 1 rules (index.html skipC / showD): C if 4+ real B words, D if 15+ real C words and the language has a page D
const shownOf = (v, known, rule = { C: 4, D: 15 }) => {
  const n = pg => (known[pg] || []).filter(w => real(v, pg).some(x => x.w === w)).length;
  return ['A', 'B'].concat(n('B') >= rule.C ? ['C'] : [], n('B') >= rule.C && n('C') >= rule.D && (v.pages.D || []).length ? ['D'] : []);
};
const run = (v, known, rule, c2) => { const shown = shownOf(v, known, rule); const r = vocabEstimate(v, known, shown); return { ...r, cefr: cefrOf(r.words, r.r50, c2), shown: shown.join('') }; };
const pick = (arr, n) => arr.slice().map(x => [rnd(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
const med = (v, nA, nB) => { seed = 4242; const rs = []; for (let t = 0; t < 101; t++) rs.push(run(v, { A: W(pick(real(v, 'A'), nA)), B: W(pick(real(v, 'B'), nB)) })); rs.sort((a, b) => a.raw - b.raw); return rs[50]; };
const show = r => r.reliable ? `${fmt(r.words)}${r.words >= EST_U ? '+' : ''} ${r.cefr}` : 'REDO';

// ---------- 1. data ----------
console.log('== 1. Data (k = lemma rank)');
for (const c of codes) {
  const v = V[c], items = Object.values(v.pages).flat().filter(x => !x.fake);
  const bad = items.filter(x => !Number.isInteger(x.k) || x.k < 1);
  if (v.unit !== 'lemma' || v.U !== EST_U) fail(`${c}: vocab file needs "unit":"lemma","U":${EST_U}`);
  if (bad.length) fail(`${c}: ${bad.length} real items without an integer k >= 1 (${bad.slice(0, 3).map(x => x.w).join(', ')})`);
  const cap = CAPS[c];
  if (cap) for (const [w, lv] of Object.entries(cap.words)) {
    const it = items.find(x => x.w === w), cv = cap.caps[lv];
    if (!it) fail(`${c}: learner_caps.json word ${w} is not on the pages`);
    else if (!(it.k <= cv) || (it.k0 != null) !== (it.k0 > cv)) fail(`${c} ${w}: k ${it.k} / k0 ${it.k0} do not match cap ${cv} (${lv}); run node tools/add-k.mjs`);
  }
  const span = pg => { const ks = real(v, pg).map(x => x.k).sort((a, b) => a - b); return ks.length ? `${pg} ${ks[0]}–${ks[ks.length - 1]}` : `${pg} –`; };
  const nc = items.filter(x => x.k0 != null).length;
  console.log(`  ${c}  ${items.length} real items, k: ${['A', 'B', 'C', 'D'].map(span).join(' · ')}${nc ? ` · ${nc} capped by ${cap.list}` : ''}`);
}

// ---------- 2. calibration profiles (spec section 7, Phase 1) ----------
const HI = c => ['en', 'ja', 'zh'].includes(c);
const P = [
  ['P1 5 easiest A', v => run(v, { A: W(real(v, 'A').slice(0, 5)) }), (r) => r.words >= 100 && r.words <= 250],
  ['P2 7 random A', v => med(v, 7, 0), r => r.words >= 100 && r.words <= 300],
  ['P3 8 random A', v => med(v, 8, 0), r => r.words >= 100 && r.words <= 350],
  ['P4 8 easiest A', v => run(v, { A: W(real(v, 'A').slice(0, 8)) }), r => r.words >= 150 && r.words <= 350],
  ['P5 8 rand A + 2 rand B', v => med(v, 8, 2), r => r.words >= 100 && r.words <= 350],
  ['P6 all of A only', v => run(v, { A: W(real(v, 'A')) }), (r, c) => HI(c) ? r.words >= 900 && r.words <= 1100 : r.words >= 500 && r.words <= 900],
  ['P7 all A + 3 hardest B', v => run(v, { A: W(real(v, 'A')), B: W(real(v, 'B').slice(-3)) }), (r, c, o) => r.words >= o.P6.words && r.words <= 1300],
  ['P8 all A + all B, 0 C', v => run(v, { A: W(real(v, 'A')), B: W(real(v, 'B')) }), (r, c) => c === 'en' ? r.words >= 3300 && r.words <= 3700 : r.words >= 2000 && r.words <= 3700],
  ['P9 A + B + 10 easiest C', v => run(v, { A: W(real(v, 'A')), B: W(real(v, 'B')), C: W(real(v, 'C').slice(0, 10)) }), r => r.words >= 3000 && r.words <= 4700],
  ['P10 OWNER A+19B+14C', v => run(v, { A: W(real(v, 'A')), B: W(real(v, 'B').slice(0, 19)), C: W(real(v, 'C').slice(0, 14)) }),
    (r, c) => c === 'ko' ? r.words >= 3200 && r.words <= 4000 : c === 'en' ? r.words >= 4400 && r.words <= 4900 && r.cefr === 'C1' : r.words >= 3700 && r.words <= 4800 && r.cefr === 'C1'],
  ['P11 P10 + 1 fake on A', v => run(v, { A: W(real(v, 'A')).concat(fk(v, 'A').slice(0, 1)), B: W(real(v, 'B').slice(0, 19)), C: W(real(v, 'C').slice(0, 14)) }),
    (r, c, o) => r.raw >= 0.85 * o.P10.raw && r.raw <= 0.95 * o.P10.raw],
  ['P12 P10 + 2 fakes (A,C)', v => run(v, { A: W(real(v, 'A')).concat(fk(v, 'A').slice(0, 1)), B: W(real(v, 'B').slice(0, 19)), C: W(real(v, 'C').slice(0, 14)).concat(fk(v, 'C').slice(0, 1)) }),
    (r, c, o) => r.raw < o.P11.raw && r.reliable],
  ['P13 A+B+15 C, D 0 ticked', v => run(v, { A: W(real(v, 'A')), B: W(real(v, 'B')), C: W(real(v, 'C').slice(0, 15)) }), r => r.cefr !== 'C2'],
  // P14: C2 required where page D reaches past rank 20,000 (en de ja zh); elsewhere C2 needs nearly all of D
  ['P14 A+B+all C+12 D', v => run(v, { A: W(real(v, 'A')), B: W(real(v, 'B')), C: W(real(v, 'C')), D: W(real(v, 'D').slice(0, 12)) }), (r, c) => r.words >= 4200 && r.words <= 5000 && (!['en', 'de', 'ja', 'zh'].includes(c) || r.cefr === 'C2')],
  ['P15 native: every real word', v => run(v, { A: W(real(v, 'A')), B: W(real(v, 'B')), C: W(real(v, 'C')), D: W(real(v, 'D')) }), r => r.words === EST_U && r.cefr === 'C2'],
  ['P16 5 easiest A + 1 fake', v => run(v, { A: W(real(v, 'A').slice(0, 5)).concat(fk(v, 'A').slice(0, 1)) }), (r, c, o) => r.words >= 50 && r.words <= 200 && r.words <= o.P1.words],
  ['P17 half A+half B+all fakes', v => run(v, { A: W(real(v, 'A').slice(0, 10)).concat(fk(v, 'A')), B: W(real(v, 'B').slice(0, 10)).concat(fk(v, 'B')) }), r => !r.reliable],
  ['P18 everything ticked', v => run(v, { A: W(v.pages.A), B: W(v.pages.B), C: W(v.pages.C), D: W(v.pages.D || []) }), r => !r.reliable],
  // P19 (2026-11-01 review): a B2–C1 learner who knows 16 C words and 9 of the rarest D words (en: the Latinate academic
  // words) must not get the C2 chip. Worst case for the chip: the 9 D words with the highest k.
  ['P19 A+B+16 C+9 rarest D', v => run(v, { A: W(real(v, 'A')), B: W(real(v, 'B')), C: W(real(v, 'C').slice(0, 16)), D: W(real(v, 'D').sort((a, b) => b.k - a.k).slice(0, 9)) }), r => r.reliable && r.cefr !== 'C2']
];
console.log('\n== 2. Calibration profiles (X = must-pass target missed; number = lemmas known of the top 5,000)');
console.log('  ' + 'profile'.padEnd(30) + codes.map(c => c.padStart(10)).join(''));
const OUT = {};
for (const [name, f, ok] of P) {
  const id = name.split(' ')[0];
  const cells = codes.map(c => {
    OUT[c] = OUT[c] || {};
    const r = f(V[c]); OUT[c][id] = r;
    const pass = ok(r, c, OUT[c]);
    if (!pass) fail(`${c} ${name}: got ${show(r)} (raw ${r.raw})`);
    return ((pass ? '' : 'X ') + show(r)).padStart(10);
  });
  console.log('  ' + name.padEnd(30) + cells.join(''));
}
console.log('  owner (P10) detail: ' + codes.map(c => { const r = OUT[c].P10; return `${c} ${fmt(r.raw)} (80% ${fmt(r.lo)}–${fmt(r.hi)}, R50 ${fmt(r.r50)})`; }).join(' · '));

// 2b. A textbook A2 learner of Japanese / Chinese: all of A, 10 beginner-list words on B (JLPT N5/N4, HSK 2.0 1-4) and the
// beginner-list words on C. Subtitle ranks made 傘 箸 碗 look rare and read this learner as B1; the learner-list caps fix it.
const TEXTBOOK = {
  ja: { B: ['窓', '意見', '靴', '川', '寂しい', '魚', '安い', '泳ぐ', '天気', '台所'], C: ['傘', '箸', '枕', '夕日'] },
  zh: { B: ['建议', '拒绝', '讨论', '厨房', '骄傲', '邻居', '面包', '护照', '冰箱', '盘子'], C: ['碗', '枕头', '账单'] }
};
for (const c of codes.filter(c => TEXTBOOK[c])) {
  const v = V[c], r = run(v, { A: W(real(v, 'A')), B: TEXTBOOK[c].B, C: TEXTBOOK[c].C }), ok = r.reliable && r.cefr === 'A2';
  if (!ok) fail(`${c} textbook A2 learner: got ${show(r)}`);
  console.log(`  ${ok ? 'ok' : 'X '} 2b ${c} textbook A2 learner (all A + ${TEXTBOOK[c].B.length} B + ${TEXTBOOK[c].C.join(' ')}): ${show(r)} (raw ${fmt(r.raw)}; must be A2)`);
}

// 2c. en, the reviewer's browser case: all A + all B + 16 C + 9 Latinate academic D words (rare in subtitles, well known to
// educated learners). Gave 4,800 "About level C2" (R50 16,036) with the old C2 rule (R50 >= 15,000); must be C1.
if (codes.includes('en')) {
  const v = V.en, AC = ['discrepancy', 'mitigate', 'serendipity', 'linguistics', 'calibration', 'denote', 'traceable', 'solidify', 'frugal'];
  for (const drop of [['countenance', 'feral', 'eulogy', 'feeble'], ['countenance', 'feral', 'eulogy', 'feeble', 'vile'], ['countenance', 'feral', 'eulogy']]) {
    const C = W(real(v, 'C')).filter(w => !drop.includes(w)), r = run(v, { A: W(real(v, 'A')), B: W(real(v, 'B')), C, D: AC }), ok = r.reliable && r.cefr === 'C1';
    if (!ok) fail(`en ${C.length} C + 9 academic D: got ${show(r)} (R50 ${fmt(r.r50)})`);
    console.log(`  ${ok ? 'ok' : 'X '} 2c en all A + B + ${C.length} C + 9 academic D (discrepancy, mitigate … frugal): ${show(r)} (R50 ${fmt(r.r50)}; must be C1, C2 needs R50 ≥ ${fmt(EST_C2_R50)})`);
  }
}

// ---------- 3. invariants ----------
console.log('\n== 3. Invariants (300 random answer sets per language)');
{
  let up = 0, upN = 0, upWorst = 0, fake = 0, fakeN = 0, det = 0, zero = 0;
  seed = 4242;
  for (const c of codes) {
    const v = V[c], pages = ['A', 'B', 'C', 'D'].filter(p => (v.pages[p] || []).length);
    for (let t = 0; t < 300; t++) {
      const known = {};
      pages.forEach(p => { const fr = rnd(); known[p] = W(real(v, p).filter(() => rnd() < fr)); if (rnd() < 0.3) known[p] = known[p].concat(fk(v, p).slice(0, 1)); });
      const base = vocabEstimate(v, known, pages);
      if (JSON.stringify(base) !== JSON.stringify(vocabEstimate(v, known, pages))) det++;
      for (const p of pages) {
        const un = real(v, p).filter(x => !known[p].includes(x.w));
        if (un.length) { const add = un[Math.floor(rnd() * un.length)]; const r2 = vocabEstimate(v, { ...known, [p]: known[p].concat([add.w]) }, pages); upN++; if (base.realKnown > 0 && r2.raw < base.raw) { up++; upWorst = Math.max(upWorst, base.raw - r2.raw); } }
        const fs_ = fk(v, p).filter(w => !known[p].includes(w));
        if (fs_.length && base.realKnown > 0) { const r3 = vocabEstimate(v, { ...known, [p]: known[p].concat([fs_[0]]) }, pages); fakeN++; if (r3.raw > base.raw) fake++; }
      }
    }
    const z = vocabEstimate(v, { A: fk(v, 'A') }, ['A', 'B']); if (z.words !== 0) zero++;
  }
  const v = V[codes[0]], k = { A: W(real(v, 'A')), B: W(real(v, 'B')), C: W(real(v, 'C').slice(0, 10)) };
  vocabEstimate(v, k, ['A', 'B', 'C']);
  const t0 = performance.now(); for (let i = 0; i < 100; i++) vocabEstimate(v, k, ['A', 'B', 'C']); const ms = (performance.now() - t0) / 100;
  const line = (ok, s) => { console.log(`  ${ok ? 'ok' : 'X '} ${s}`); if (!ok) fail('invariant: ' + s); };
  line(up === 0, `one more real tick never lowers raw: ${up} of ${upN} lowered${up ? ` (worst −${upWorst})` : ''}`);
  line(fake === 0, `one more made-up tick never raises raw: ${fake} of ${fakeN} raised`);
  line(det === 0, `same answers -> same output: ${det} differed`);
  line(ms < 5, `time per call: ${ms.toFixed(2)} ms (< 5 ms)`);
  line(zero === 0, `0 real words ticked -> 0 (also with made-up words ticked): ${zero} languages wrong`);
}

// ---------- 4. Phase 2 design: lemma-band pages, 5 fakes each, random words (spec sections 2 and 7) ----------
const spread = (lo, hi, n) => Array.from({ length: n }, (_, i) => Math.round(lo * Math.pow(hi / lo, (i + .5) / n)));
const K2 = { A: [...spread(30, 250, 7), ...spread(250, 500, 7), ...spread(500, 1000, 6)], B: [...spread(1000, 1600, 10), ...spread(1600, 2500, 10)], C: [...spread(2500, 3500, 10), ...spread(3500, 5000, 10)], D: [...spread(5000, 7000, 10), ...spread(7000, 10000, 10)] };
const V2 = { unit: 'lemma', U: EST_U, pages: {} };
for (const pg of 'ABCD') V2.pages[pg] = K2[pg].map((k, i) => ({ w: pg + i, k })).concat([0, 1, 2, 3, 4].map(i => ({ w: pg + 'f' + i, fake: 1 })));
const RULE2 = { C: 7, D: 8 };
// Phase 2 has random D words (k 5,000–10,000) without the academic bias of today's hand-picked D pages, so its C2 chip
// goes back to R50 >= 15,000 (set EST_C2_R50 = 15000 when Phase 2 ships).
const C2_P2 = 15000;
console.log('\n== 4a. Phase 2 design profiles (must be within one rounding step; C2 chip at R50 ≥ 15,000 as planned for Phase 2)');
{
  const first = m => { const known = {}; for (const pg of 'ABCD') known[pg] = real(V2, pg).slice(0, m[pg] || 0).map(x => x.w).concat(fk(V2, pg).slice(0, (m.f || {})[pg] || 0)); return known; };
  const rows = [['5 easiest A', { A: 5 }, 200], ['8 easiest A', { A: 8 }, 350], ['8 random A', 'r8', 250], ['all of A', { A: 20 }, 1100], ['A + 10 B', { A: 20, B: 10 }, 1800, 'A2'],
    ['A + B', { A: 20, B: 20 }, 2700, 'B1'], ['A + B + 10 C', { A: 20, B: 20, C: 10 }, 3300, 'B2'], ['A + 19 B + 14 C + 4 D', { A: 20, B: 19, C: 14, D: 4 }, 3800, 'C1'],
    ['same + 1 fake', { A: 20, B: 19, C: 14, D: 4, f: { A: 1 } }, 3600], ['A + B + 18 C + 8 D', { A: 20, B: 20, C: 18, D: 8 }, 4300, 'C1'],
    ['A + B + C + 16 D', { A: 20, B: 20, C: 20, D: 16 }, 4800, 'C2'], ['everything real', { A: 20, B: 20, C: 20, D: 20 }, 5000, 'C2'], ['10 A + 3 fakes', { A: 10, f: { A: 3 } }, 'REDO']];
  seed = 5;
  for (const [name, m, want, cefr] of rows) {
    let r;
    if (m === 'r8') { const rs = []; for (let t = 0; t < 101; t++) { const ws = real(V2, 'A').map(x => [rnd(), x.w]).sort((a, b) => a[0] - b[0]).slice(0, 8).map(x => x[1]); rs.push(run(V2, { A: ws }, RULE2, C2_P2)); } rs.sort((a, b) => a.raw - b.raw); r = rs[50]; }
    else r = run(V2, first(m), RULE2, C2_P2);
    const ok = want === 'REDO' ? !r.reliable : r.reliable && Math.abs(r.words - want) <= (want < 1000 ? 50 : 100) && (!cefr || r.cefr === cefr);
    if (!ok) fail(`Phase 2 ${name}: got ${show(r)}, want ${want}${cefr ? ' ' + cefr : ''}`);
    console.log(`  ${ok ? 'ok' : 'X '} ${name.padEnd(24)} ${show(r).padEnd(10)} want ${want === 'REDO' ? 'REDO' : fmt(want) + (cefr ? ' ' + cefr : '')}   pages ${r.shown}  80% ${fmt(r.lo)}–${fmt(r.hi)}`);
  }
}
// learners who follow the model exactly: P(know k) = 1/(1+(k/R50)^a), yes-bias g on unknown and made-up words
const sig = z => 1 / (1 + Math.exp(-z));
const answerPage = (v, pg, know, g) => (v.pages[pg] || []).filter(it => it.fake ? rnd() < g : (p => rnd() < p + (1 - p) * g)(know(it))).map(it => it.w);
function takeTest(v, know, g, rule) {
  const known = { A: answerPage(v, 'A', know, g), B: answerPage(v, 'B', know, g) }, shown = ['A', 'B'];
  const nReal = pg => known[pg].filter(w => v.pages[pg].some(x => !x.fake && x.w === w)).length;
  if (nReal('B') >= rule.C) { shown.push('C'); known.C = answerPage(v, 'C', know, g); if (nReal('C') >= rule.D && (v.pages.D || []).length) { shown.push('D'); known.D = answerPage(v, 'D', know, g); } }
  const r = vocabEstimate(v, known, shown); return { ...r, cefr: cefrOf(r.words, r.r50), shown: shown.join('') };
}
const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
// Truth models for recovery, independent of the estimator's own curve: P(know lemma k) = sig(a(θ − ln k − ε)),
// ε ~ N(0, σ) drawn per learner and word (word-to-word variation: cognates, concreteness, rank error in k). σ > 0
// flattens the average curve: effective slope ≈ a / √(1 + a²σ²/2.9) (ideal 2.0, realistic 1.46, mid 1.37, steep 3.0).
// One fixed slope cannot be right for all four: EST_A = 1.75 sits between them (steep beginners read high, flat ones low).
// Truth = expected lemmas known among the top 5,000 (N5) under that model; ratio = shown raw ÷ (N5 × (1 − g)).
const MODELS = [['ideal', 2, 0], ['realistic', 2, 0.8], ['mid', 1.5, 0.5], ['steep', 3, 0]];
const normal = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
const QZ = Array.from({ length: 21 }, (_, i) => -3 + 0.3 * i), QW = QZ.map(z => Math.exp(-z * z / 2)), QS = QW.reduce((a, b) => a + b, 0);
const pAvg = (a, s, x) => s ? QZ.reduce((t, z, i) => t + QW[i] * sig(a * (x - s * z)), 0) / QS : sig(a * x);
const n5Of = (a, s, th) => { let t = 0; for (let k = 1; k <= EST_U; k++) t += pAvg(a, s, th - Math.log(k)); return t; };
const thFor = (a, s, n5) => { let lo = Math.log(5), hi = Math.log(1e6); for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (n5Of(a, s, m) < n5) lo = m; else hi = m; } return (lo + hi) / 2; };
const LEVELS = [250, 600, 1000, 1500, 2500, 3500, 4500];   // true N5: A1 A1 A1 A2 B1 B2 C1
const TH = {}; for (const [, a, s] of MODELS) for (const n of LEVELS) TH[a + ':' + s + ':' + n] = thFor(a, s, n);
const recov = (v, rule, a, s, n5, g) => { const th = TH[a + ':' + s + ':' + n5], r = takeTest(v, it => sig(a * (th - Math.log(it.k) - (s ? s * normal() : 0))), g, rule); return r.reliable ? r.raw / (n5 * (1 - g)) : null; };
// must-pass band for the median ratio. Central models (ideal, realistic): 0.80–1.20, and 0.88–1.12 from B1 (N5 2,500) up.
// Extreme models (mid = flatter, steep): 0.70–1.45 below B1 (the price of one fixed slope), 0.85–1.15 from B1 up.
const band = (name, n5) => ['ideal', 'realistic'].includes(name) ? (n5 >= 2500 ? [0.88, 1.12] : [0.80, 1.20]) : (n5 >= 2500 ? [0.85, 1.15] : [0.70, 1.45]);
console.log('\n== 4b. Recovery, Phase 2 design, 4 truth models (300 learners per cell, yes-bias 2 %): median shown ÷ (true N5 × (1 − g)), [10–90 %]');
console.log('  ' + 'true N5'.padEnd(9) + MODELS.map(([n, a, s]) => `${n} a${a} σ${s}`.padEnd(24)).join(''));
{
  seed = 99;
  for (const n5 of LEVELS) {
    const cells = MODELS.map(([name, a, s]) => {
      const rs = []; for (let t = 0; t < 300; t++) { const x = recov(V2, RULE2, a, s, n5, 0.02); if (x != null) rs.push(x); }
      rs.sort((x, y) => x - y);
      const m = pct(rs, .5), [lo, hi] = band(name, n5), ok = m >= lo && m <= hi;
      if (!ok) fail(`recovery (Phase 2 design) ${name} N5 ${n5}: median ${m.toFixed(2)} outside ${lo}–${hi}`);
      return `${ok ? '' : 'X '}${m.toFixed(2)} [${pct(rs, .1).toFixed(2)}–${pct(rs, .9).toFixed(2)}]`.padEnd(24);
    });
    console.log('  ' + fmt(n5).padEnd(9) + cells.join(''));
  }
}
console.log('\n== 4c. Recovery on the real pages (Phase 1 rules), 4 truth models: median shown ÷ (true N5 × (1 − g))');
console.log('  pooled median over the 13 languages (must-pass, same bands as 4b) and [min–max of the per-language medians]; ' + (QUICK ? 60 : 150) + ' learners per language and cell, yes-bias 2 %');
console.log('  ' + 'true N5'.padEnd(9) + MODELS.map(([n, a, s]) => `${n} a${a} σ${s}`.padEnd(24)).join(''));
{
  seed = 77;
  const n = QUICK ? 60 : 150;
  for (const n5 of LEVELS) {
    const cells = MODELS.map(([name, a, s]) => {
      const all = [], ms = codes.map(c => { const rs = []; for (let t = 0; t < n; t++) { const x = recov(V[c], { C: 4, D: 15 }, a, s, n5, 0.02); if (x != null) rs.push(x); } all.push(...rs); rs.sort((x, y) => x - y); return pct(rs, .5); });
      all.sort((x, y) => x - y);
      const m = pct(all, .5), [lo, hi] = band(name, n5), ok = m >= lo && m <= hi;
      if (!ok) fail(`recovery (real pages) ${name} N5 ${n5}: pooled median ${m.toFixed(2)} outside ${lo}–${hi}`);
      return `${ok ? '' : 'X '}${m.toFixed(2)} [${Math.min(...ms).toFixed(2)}–${Math.max(...ms).toFixed(2)}]`.padEnd(24);
    });
    console.log('  ' + fmt(n5).padEnd(9) + cells.join(''));
  }
}

// ---------- 4d. over-claimers (report only; 2026-11-01 review) ----------
// Realistic learners (a = 2, word noise σ = 1.0) who tick unknown REAL words (gR) more often than made-up words (gF). The
// h − f correction only sees the made-up words (3 per page, 9–12 in all), so this kind of over-claiming is invisible to it.
// Ratio = shown ÷ true N5 (no (1 − g) discount: the truth is what they know). "high" = chip above the true level.
// "fit" = share with person-fit lz < −1.645 (Drasgow, Levine & Williams 1985; tools/analyze-ticks.mjs reports it per market
// after launch): how many of them a pattern check would catch, and how many honest learners (first block) it would bother.
const lzOf = (v, known, shown, r) => {
  const th = Math.log(Math.max(r.r50, 1)), g = r.g; let l0 = 0, E = 0, Vr = 0;
  shown.forEach(pg => { const ks = new Set(known[pg] || []); (v.pages[pg] || []).forEach(it => { if (it.fake) return; const p = 1 / (1 + Math.exp(-EST_A * (th - Math.log(it.k)))), q = Math.min(1 - 1e-6, Math.max(1e-6, g + (1 - g) * p)), y = ks.has(it.w); l0 += y ? Math.log(q) : Math.log(1 - q); E += q * Math.log(q) + (1 - q) * Math.log(1 - q); Vr += q * (1 - q) * Math.log(q / (1 - q)) ** 2; }); });
  return Vr > 0 ? (l0 - E) / Math.sqrt(Vr) : 0;
};
console.log('\n== 4d. Over-claimers on the real pages (report only; a = 2, word noise σ = 1.0; made-up ticks gF, unknown-real ticks gR)');
console.log('  median shown ÷ true N5 [min–max of the 13 language medians] · chip above the true level · redo screen · person-fit flag (lz < −1.645)');
{
  seed = 404;
  const n = QUICK ? 40 : 100, a = 2, s = 1.0, L = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], LV = [100, 300, 600, 1000, 2000, 3500, 4500];
  for (const [gF, gR] of [[0.02, 0.02], [0.03, 0.10], [0.05, 0.20]]) {
    console.log(`  gF ${Math.round(gF * 100)} %, gR ${Math.round(gR * 100)} %${gF === gR ? ' (honest: same rate on both)' : ''}`);
    for (const n5 of LV) {
      const th = thFor(a, s, n5), tc = cefrOf(n5, Math.exp(th), 15000), all = [], meds = []; let high = 0, redo = 0, fit = 0, cnt = 0;
      for (const c of codes) {
        const v = V[c], rs = [];
        const ans = pg => (v.pages[pg] || []).filter(it => it.fake ? rnd() < gF : (rnd() < sig(a * (th - Math.log(it.k) - s * normal())) || rnd() < gR)).map(it => it.w);
        for (let t = 0; t < n; t++) {
          const known = { A: ans('A'), B: ans('B') }, shown = ['A', 'B'];
          const nr = pg => known[pg].filter(w => v.pages[pg].some(x => !x.fake && x.w === w)).length;
          if (nr('B') >= 4) { shown.push('C'); known.C = ans('C'); if (nr('C') >= 15 && (v.pages.D || []).length) { shown.push('D'); known.D = ans('D'); } }
          const r = vocabEstimate(v, known, shown); cnt++;
          if (!r.reliable) { redo++; continue; }
          if (!r.realKnown) { rs.push(0); continue; }
          rs.push(r.raw / n5);
          if (L.indexOf(cefrOf(r.words, r.r50)) > L.indexOf(tc)) high++;
          if (lzOf(v, known, shown, r) < -1.645) fit++;
        }
        rs.sort((x, y) => x - y); meds.push(pct(rs, .5)); all.push(...rs);
      }
      all.sort((x, y) => x - y);
      const P = x => (Math.round(1000 * x / cnt) / 10 + ' %').padStart(7);
      console.log(`    true N5 ${fmt(n5).padEnd(6)} ${tc}  ${pct(all, .5).toFixed(2)} [${Math.min(...meds).toFixed(2)}–${Math.max(...meds).toFixed(2)}]   high${P(high)}   redo${P(redo)}   fit${P(fit)}`);
    }
  }
}

// ---------- 5. synthetic learners on the real Phase 1 pages (report only) ----------
// Learner = total lemma vocabulary Vt (100 ... 15,000). Knowledge curve (Rasch-type in log rank, as in Brysbaert et al.
// 2016 / Milton's frequency profiles): P(know lemma k) = 1/(1+exp(-a(θ - ln k - ε))), ε ~ N(0, σ) per learner and word
// (word-specific difficulty, cognates, rank error in k), slope a ∈ {1.5, 2, 2.5}. θ is solved so the expected number of
// lemmas known (all ranks up to 100,000) = Vt. Guessing: yes-bias g per learner (50 % 2 %, 30 % 5 %, 20 % 10 %) on unknown
// real words and on made-up words. Truth = expected lemmas known among the top 5,000 (N5k). Shown = estimator `raw`.
// The X_Lex-style made-up-word penalty (h − f) makes the expected ratio ≈ 1 − g (≈ 0.95 on average): by design.
// Measured 2026-11-01 with EST_A 1.75 (200 per cell): medians 0.95–1.08 at 250, 0.89–1.00 from 500 to 3,000, 0.92–0.97
// above, 1.04–1.18 at 100 (the yes-bias lifts the lowest level). With EST_A 2 it was 0.83–0.92 from 500 to 3,000.
// The h − f penalty takes ≈ g off by design. Try: --sigma=0 --slopes=2 --g=0 (ideal), --kx=1.5 (true ranks 1.5 × k)
{
  const KX = Number(opt('kx')) || 1;   // --kx: the learner's true lemma rank = k × kx (systematic rank error; 1 = k is right)
  const SIG = opt('sigma') != null ? Number(opt('sigma')) : 0.5, SLOPES = opt('slopes') ? opt('slopes').split(',').map(Number) : [1.5, 2, 2.5], SIZES = [100, 250, 500, 1000, 2000, 3000, 4500, 6000, 8000, 10000, 15000];
  const ZN = 13, Z = Array.from({ length: ZN }, (_, i) => -3 + 6 * i / (ZN - 1)), ZW = Z.map(z => Math.exp(-z * z / 2)), ZS = ZW.reduce((a, b) => a + b, 0);
  const pc = (a, x) => { let s = 0; for (let i = 0; i < ZN; i++) s += ZW[i] * sig(a * (x - SIG * Z[i])); return s / ZS; };   // curve averaged over ε
  // expected lemmas known among ranks 1..K: ∫ pc(θ - ln x) dx over [0.5, K + 0.5] (substitute u = ln x)
  const known = (a, th, K) => { const u0 = Math.log(0.5), u1 = Math.log(K + 0.5), n = 600, h = (u1 - u0) / n; let s = 0; for (let i = 0; i <= n; i++) { const u = u0 + i * h; s += (i === 0 || i === n ? 0.5 : 1) * pc(a, th - u) * Math.exp(u); } return s * h; };
  const solve = (a, Vt) => { let lo = Math.log(1), hi = Math.log(1e6); for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (known(a, m, 100000) < Vt) lo = m; else hi = m; } return (lo + hi) / 2; };
  const TH = {}; for (const a of SLOPES) for (const Vt of SIZES) { const th = solve(a, Vt); TH[a + ':' + Vt] = { th, n5k: known(a, th, EST_U) }; }
  const normal = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const G = opt('g') != null ? Number(opt('g')) : null, gOf = () => { if (G != null) return G; const x = rnd(); return x < 0.5 ? 0.02 : x < 0.8 ? 0.05 : 0.10; };
  const res = {};   // res[c][Vt] = [{ratio, err, cefrOk, redo}]
  seed = 2026;
  for (const c of codes) {
    res[c] = {};
    for (const Vt of SIZES) {
      const out = [];
      for (let t = 0; t < SIM_N; t++) {
        const a = SLOPES[t % SLOPES.length], { th, n5k } = TH[a + ':' + Vt], g = gOf();
        const r = takeTest(V[c], it => sig(a * (th - Math.log(it.k * KX) - SIG * normal())), g, { C: 4, D: 15 });
        const tc = cefrOf(n5k, Math.exp(th), 15000), L = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];   // true level: C2 = R50 ≥ 15,000 (definition)
        out.push({ ratio: r.raw / n5k, xl: r.raw / (n5k * (1 - g)), err: Math.abs(r.raw - n5k) / n5k, cefr: Math.abs(L.indexOf(r.cefr) - L.indexOf(tc)), redo: !r.reliable, pages: r.shown.length });
      }
      res[c][Vt] = out;
    }
  }
  const n5 = Vt => Math.round(TH['2:' + Vt].n5k);
  console.log(`\n== 5. Synthetic learners on the real pages (${SIM_N} per cell; a ∈ {1.5, 2, 2.5}, word noise σ = ${SIG} ln-rank, yes-bias 2/5/10 %)`);
  console.log('  5a. Bias: median of shown ÷ true N5k   (1.00 = right; > 1.15 over-estimates, < 0.85 under-estimates, marked !)');
  console.log('  ' + 'true lemmas'.padEnd(12) + 'N5k (a=2)'.padStart(10) + codes.map(c => c.padStart(7)).join('') + '   all p10–p90   all ÷ N5k(1−g)');
  for (const Vt of SIZES) {
    const cells = codes.map(c => { const rs = res[c][Vt].map(x => x.ratio).sort((a, b) => a - b), m = pct(rs, .5); return ((m > 1.15 || m < 0.85 ? '!' : '') + m.toFixed(2)).padStart(7); });
    const all = codes.flatMap(c => res[c][Vt].map(x => x.ratio)).sort((a, b) => a - b);
    const xl = codes.flatMap(c => res[c][Vt].map(x => x.xl)).sort((a, b) => a - b);
    console.log('  ' + fmt(Vt).padEnd(12) + fmt(n5(Vt)).padStart(10) + cells.join('') + `   ${pct(all, .1).toFixed(2)}–${pct(all, .9).toFixed(2)}     ${pct(xl, .5).toFixed(2)}`);
  }
  console.log('  5b. Median absolute error, % of true N5k');
  console.log('  ' + 'true lemmas'.padEnd(12) + ''.padStart(10) + codes.map(c => c.padStart(7)).join('') + '   all');
  for (const Vt of SIZES) {
    const cells = codes.map(c => (Math.round(100 * pct(res[c][Vt].map(x => x.err).sort((a, b) => a - b), .5)) + '%').padStart(7));
    const all = codes.flatMap(c => res[c][Vt].map(x => x.err)).sort((a, b) => a - b);
    console.log('  ' + fmt(Vt).padEnd(12) + ''.padStart(10) + cells.join('') + `   ${Math.round(100 * pct(all, .5))}%`);
  }
  console.log('  5c. CEFR chip vs the true level (all languages): exact / within one level / redo screen / pages seen');
  for (const Vt of SIZES) {
    const all = codes.flatMap(c => res[c][Vt]), n = all.length;
    console.log(`  ${fmt(Vt).padEnd(12)}${(Math.round(100 * all.filter(x => x.cefr === 0).length / n) + '%').padStart(10)}${(Math.round(100 * all.filter(x => x.cefr <= 1).length / n) + '%').padStart(8)}${(Math.round(1000 * all.filter(x => x.redo).length / n) / 10 + '%').padStart(8)}${(all.reduce((s, x) => s + x.pages, 0) / n).toFixed(1).padStart(8)}`);
  }
}

// ---------- 6. typed-language word packs (no vocab file: the AI pack's lists, or the i18n fallback lists) ----------
// packVocab gives every word on a page the geometric middle of its lemma band (A 173, B 1,581, C 3,536), so the
// result depends only on how many words per page were ticked. Packs have no made-up words and no page D.
console.log('\n== 6. Typed-language word packs (packVocab; i18n test lists as stand-in packs)');
{
  const PACKS = JSON.parse(fs.readFileSync(path.join(here, 'engine-data', 'pack-lists.json'), 'utf8'));
  const I = Object.fromEntries(ALL.map(c => [c, PACKS[c]]).filter(x => x[1]));
  const runP = (v, known) => { const shown = ['A', 'B'].concat((known.B || []).length >= 4 ? ['C'] : []); const r = vocabEstimate(v, known, shown); return { ...r, cefr: cefrOf(r.words, r.r50) }; };
  let orderBad = 0, orderN = 0; const rowsP = {};
  seed = 31;
  for (const [c, t] of Object.entries(I)) {
    const v = packVocab(t), A = t.A, B = t.B, C = t.C;
    // order: 30 random sets of 8 A words (and of 10 B words with all A) give exactly the same result
    const r8 = runP(v, { A: A.slice(0, 8) }).raw, r10 = runP(v, { A, B: B.slice(0, 10) }).raw;
    for (let i = 0; i < 30; i++) { orderN += 2; if (runP(v, { A: pick(A, 8) }).raw !== r8) orderBad++; if (runP(v, { A, B: pick(B, 10) }).raw !== r10) orderBad++; }
    rowsP[c] = [['8 A', { A: A.slice(0, 8) }, r => r.words >= 150 && r.words <= 300], ['all A', { A }, r => r.words >= 600 && r.words <= 1100],
      ['all A + 10 B', { A, B: B.slice(0, 10) }, r => r.cefr === 'A2'], ['A + B', { A, B }, r => r.words >= 2200 && r.words <= 3000],
      ['A + 19 B + 14 C', { A, B: B.slice(0, 19), C: C.slice(0, 14) }, r => r.words >= 3500 && r.words <= 4500 && r.cefr !== 'C2']]
      .map(([n, k, ok]) => { const r = runP(v, k), pass = ok(r); if (!pass) fail(`typed pack (${c} lists) ${n}: got ${show(r)}`); return [n, (pass ? '' : 'X ') + show(r)]; });
  }
  const line = (ok, s_) => { console.log(`  ${ok ? 'ok' : 'X '} ${s_}`); if (!ok) fail('typed pack: ' + s_); };
  line(orderBad === 0, `which words / their order do not matter: ${orderBad} of ${orderN} random word sets changed the result`);
  const cs = Object.keys(rowsP), same = cs.every(c => JSON.stringify(rowsP[c]) === JSON.stringify(rowsP[cs[0]]));
  const cols = same ? [cs[0]] : cs;
  console.log('  ' + 'profile'.padEnd(18) + cols.map(c => (same ? 'all ' + cs.length + ' lists' : c).padStart(same ? 14 : 10)).join(''));
  rowsP[cs[0]].forEach(([n], i) => console.log('  ' + n.padEnd(18) + cols.map(c => rowsP[c][i][1].padStart(same ? 14 : 10)).join('')));
  console.log('  (must pass: 8 A 150–300 · all A 600–1,100 · all A + 10 B = A2 · A + B 2,200–3,000 · A + 19 B + 14 C 3,500–4,500, not C2)');
}

console.log(fails.length ? `\n${fails.length} must-pass target(s) failed:\n  ` + fails.join('\n  ') : '\nall must-pass targets met');
process.exit(fails.length ? 1 : 0);
