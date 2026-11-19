// Real AI check for one rule of the New words chat: Kai writes every line fully in the learning language, with no English app
// words ("deck", "card"), except the names the learner taps ("Generate", "Review", "Random Words").
// Run from apps/server: ANTHROPIC_API_KEY=... npx tsx scripts/kai-language-try.ts
import { claudeKaiChat } from '../src/llm/claude.js';
import { KaiAnswerSchema, type KaiContext } from '../src/llm/kai-chat.js';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
const kai = claudeKaiChat(key);

const words = { total: 10, reviewedLastDay: 8, dueNow: 2, sample: [{ word: 'la propina', translation: 'the tip' }] };
const decks = { newWordsLeft: 2, topics: ['Ordering food in a restaurant'], offered: [] };
const es: KaiContext = {
  name: 'Maya', learningLanguage: 'Spanish', nativeLanguage: 'English', cefr: 'A1', knownWords: 150, goal: 'travel', goalOther: null, interests: ['food', 'music'],
  notes: [], history: [], words: { total: 0, reviewedLastDay: 0, dueNow: 0, sample: [] }, opening: true, firstVisit: true, userText: null,
};
const fa: KaiContext = { ...es, name: 'Sara', learningLanguage: 'Persian' };
const later = (base: KaiContext, hello: string, userText: string | null, over: Partial<KaiContext> = {}): KaiContext => ({ ...base, opening: false, firstVisit: false, words, decks, history: [{ from: 'kai', text: hello }], userText, ...over });

const cases: [string, KaiContext][] = [
  ['es · first visit', es],
  ['es · asks for new words', later(es, '¡Hola Maya! 👋', 'Quiero palabras nuevas')],
  ['es · own deck', later(es, '¡Hola Maya! 👋', 'I need words for working in a coffee shop')],
  ['es · deck is ready', later(es, '¡Hola Maya! 👋', null, { event: { deckReady: { title: 'Trabajar en una cafetería', wordCount: 15 } } })],
  ['es · how do I say', later(es, '¡Hola Maya! 👋', 'how do I say "to go" for a coffee?')],
  ['fa · first visit', fa],
  ['fa · asks for new words', later(fa, 'سلام سارا! 👋', 'I want new words')],
  ['fa · own deck', later(fa, 'سلام سارا! 👋', 'I need words for a trip to Shiraz')],
  ['fa · deck is ready', later(fa, 'سلام سارا! 👋', null, { event: { deckReady: { title: 'سفر به شیراز', wordCount: 15 } } })],
  ['fa · how do I say', later(fa, 'سلام سارا! 👋', 'how do I say thank you?')],
];

// English app words that must not be in a line. The names the learner taps are fine.
const appWord = /\b(decks?|cards?|flashcards?|word lists?)\b/i;
let wrong = 0;
for (const [name, ctx] of cases) {
  for (let run = 1; run <= 2; run++) {
    try {
      const answer = KaiAnswerSchema.parse(await kai.answer(ctx, Date.now() + 20_000));
      const lines = answer.lines.map((l) => l.text);
      const bad = [...lines, ...answer.options].filter((t) => appWord.test(t));
      if (bad.length) wrong++;
      console.log(`${bad.length ? 'WRONG' : 'ok   '} ${name} (${run}) → ${lines.join(' / ')}${answer.options.length ? ` · options: ${answer.options.join(' | ')}` : ''}${answer.decks ? ` · ${answer.decks.length} deck idea(s)` : ''}`);
    } catch (e) {
      wrong++;
      console.log(`ERROR ${name} (${run}) → ${e instanceof Error ? e.message.slice(0, 120) : 'failed'}`);
    }
  }
}
console.log(`\n${cases.length * 2 - wrong} of ${cases.length * 2} with no English app word`);
process.exit(wrong ? 1 : 0);
