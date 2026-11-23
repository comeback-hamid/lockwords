import { mkdirSync, writeFileSync } from 'node:fs';

import { cutSheet } from '../src/decks/cut-sheet.js';
import { claudeDeckMaker } from '../src/llm/claude.js';
import { gridFor, openaiSheetMaker } from '../src/llm/deck-pictures.js';
import { checkCards, type DeckInput } from '../src/llm/make-deck.js';

// One real run of a whole deck: title, words (real Claude) and the picture sheet (real image model), timed.
// For a learner of English who speaks Persian, with the topic in Persian (the bug of 2026-11-23).
//   ANTHROPIC_API_KEY=… OPENAI_API_KEY=… npx tsx scripts/deck-pictures-try.ts [words] [out folder]
const size = Number(process.argv[2] ?? 10);
const out = process.argv[3] ?? 'tmp/deck-pictures-try';
const input: DeckInput = { topic: 'سفارش غذا', learningLanguage: 'en', nativeLanguage: 'fa', cefr: 'A2', level: 'some_basics', knownWords: 1200, goal: 'travel', goalOther: null, interests: ['food'], wordCount: size };
const maker = claudeDeckMaker(process.env.ANTHROPIC_API_KEY!);
const seconds = (from: number) => ((Date.now() - from) / 1000).toFixed(1);

let t = Date.now();
const proposal = await maker.propose(input);
console.log(`title (${seconds(t)} s):`, proposal);
t = Date.now();
const cards = checkCards(await maker.cards(input).catch(() => maker.cards(input)), size); // one more try, like the job
console.log(`words (${seconds(t)} s):`);
for (const c of cards) console.log(`  ${c.word} | ${c.translation} | ${c.example} | picture: ${c.pictureHint}`);
t = Date.now();
const grid = gridFor(cards.length);
const sheet = await openaiSheetMaker(process.env.OPENAI_API_KEY!, fetch, process.env.OPENAI_IMAGE_MODEL).sheet(cards, grid);
console.log(`sheet of ${cards.length} (${seconds(t)} s), ${Math.round(sheet.length / 1024)} KB`);
t = Date.now();
const pictures = await cutSheet(sheet, grid, cards.length);
console.log(`cut into ${pictures.length} (${seconds(t)} s), ${Math.round(pictures.reduce((n, p) => n + p.length, 0) / pictures.length / 1024)} KB each`);
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/sheet.png`, sheet);
pictures.forEach((p, i) => writeFileSync(`${out}/${String(i + 1).padStart(2, '0')}.webp`, p));
