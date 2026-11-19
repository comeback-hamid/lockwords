// Real AI check for word cards in the New words chat: asks the real model "how do I say" and "what does it mean"
// in Spanish and Persian and prints the cards to read by hand (right word, natural example, right translation).
// Run from apps/server: ANTHROPIC_API_KEY=... npx tsx scripts/kai-words-try.ts
import { claudeKaiChat } from '../src/llm/claude.js';
import { KaiAnswerSchema, type KaiContext } from '../src/llm/kai-chat.js';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
const kai = claudeKaiChat(key);

const es: KaiContext = {
  name: 'Maya', learningLanguage: 'Spanish', nativeLanguage: 'English', cefr: 'A2', knownWords: 600, goal: 'travel', goalOther: null, interests: ['food', 'music'],
  notes: [], history: [{ from: 'kai', text: '¡Hola Maya! 👋' }], words: { total: 10, reviewedLastDay: 4, dueNow: 3, sample: [{ word: 'la propina', translation: 'the tip' }] }, opening: false, firstVisit: false, userText: null,
};
const fa: KaiContext = { ...es, name: 'Sara', learningLanguage: 'Persian', cefr: 'A1', knownWords: 150, history: [{ from: 'kai', text: 'سلام سارا! 👋' }], words: { ...es.words, sample: [{ word: 'سلام', translation: 'hello' }] } };
const ask = (base: KaiContext, userText: string, over: Partial<KaiContext> = {}): KaiContext => ({ ...base, userText, ...over });

// [name, context, should a card come back?]
const cases: [string, KaiContext, boolean][] = [
  ['es · how do I say "to go" for food', ask(es, 'How do I say "to go" for food?'), true],
  ['es · how do I say umbrella', ask(es, 'How do I say umbrella?'), true],
  ['es · cómo se dice', ask(es, '¿Cómo se dice "receipt" en español?'), true],
  ['es · a phrase', ask(es, 'how do you say "I am allergic to nuts"'), true],
  ['es · what does it mean', ask(es, 'What does "madrugada" mean?'), true],
  ['es · qué significa', ask(es, '¿Qué significa "sobremesa"?'), true],
  ['es · a word to keep', ask(es, 'I saw the word "aguacate" on a menu. I want to keep it.'), true],
  ['es · a verb', ask(es, 'How do I say "to book a table"?'), true],
  ['es · B2 idiom', ask(es, 'How do I say "it is raining cats and dogs"?', { cefr: 'B2', knownWords: 3500 }), true],
  ['es · C1 nuance word', ask(es, '¿Qué significa "empalagoso"?', { cefr: 'C1', knownWords: 5000 }), true],
  ['es · another way', ask(es, 'Otra forma de decirlo', { history: [{ from: 'user', text: 'How do I say "to go" for food?' }, { from: 'kai', text: 'Se dice **para llevar** 🥡 [word card: para llevar = to go (takeaway)]' }] }), true],
  ['es · grammar question (no card)', ask(es, 'What is the difference between ser and estar?'), false],
  ['es · culture question (no card)', ask(es, 'Do people tip in Spain?'), false],
  ['es · small talk (no card)', ask(es, 'Hola Kai, ¿cómo estás?'), false],
  ['fa · how do I say thank you', ask(fa, 'How do I say thank you?'), true],
  ['fa · how do I say water', ask(fa, 'How do I say "water"?'), true],
  ['fa · what does it mean', ask(fa, 'What does "خداحافظ" mean?'), true],
  ['fa · a phrase', ask(fa, 'How do I say "where is the bathroom?"'), true],
  ['fa · a word to keep', ask(fa, 'My friend said "دوست". I want to keep this word.'), true],
  ['fa · grammar question (no card)', ask(fa, 'Does Persian have genders for nouns?'), false],
];

let bad = 0;
for (const [name, ctx, wantsCard] of cases) {
  const t0 = Date.now();
  try {
    const raw = await kai.answer(ctx);
    const parsed = KaiAnswerSchema.safeParse(raw);
    if (!parsed.success) { bad++; console.log(`\n=== ${name} (${Date.now() - t0} ms) WRONG SHAPE\n${JSON.stringify(raw)?.slice(0, 600)}`); continue; }
    const { lines, word, options } = parsed.data;
    const right = Boolean(word) === wantsCard;
    if (!right) bad++;
    console.log(`\n=== ${name} (${Date.now() - t0} ms) ${right ? 'OK' : wantsCard ? 'NO CARD' : 'CARD NOT WANTED'}`);
    for (const l of lines) console.log(`  ${l.text}\n      ↳ ${l.translation}`);
    if (word) console.log(`  CARD  ${word.word} = ${word.translation}\n        ${word.example}\n        ${word.exampleTranslation}`);
    console.log(`  options=${JSON.stringify(options)}`);
  } catch (e) {
    bad++;
    console.log(`\n=== ${name} (${Date.now() - t0} ms) FAILED ${(e as Error).message}`);
  }
}
console.log(`\n${cases.length - bad} / ${cases.length} as wanted`);
