// Real AI check for the New words chat: asks the real model for a set of turns and prints the answers to read by hand.
// Run from apps/server: ANTHROPIC_API_KEY=... npx tsx scripts/kai-try.ts
import { claudeKaiChat } from '../src/llm/claude.js';
import { KaiAnswerSchema, type KaiContext } from '../src/llm/kai-chat.js';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
const kai = claudeKaiChat(key);

const base: KaiContext = {
  name: 'Maya', learningLanguage: 'Spanish', nativeLanguage: 'English', cefr: 'A1', knownWords: 150, goal: 'travel', goalOther: null, interests: ['food', 'music'],
  notes: [], history: [], words: { total: 0, reviewedLastDay: 0, dueNow: 0, sample: [] }, opening: true, firstVisit: true, userText: null,
};
const words = { total: 30, reviewedLastDay: 24, dueNow: 12, sample: [{ word: 'la propina', translation: 'the tip' }, { word: 'la cuenta', translation: 'the bill' }, { word: 'pedir', translation: 'to order' }] };
const said = (userText: string, over: Partial<KaiContext> = {}): KaiContext => ({ ...base, opening: false, firstVisit: false, userText, words, history: [{ from: 'kai', text: '¡Hola Maya! 👋' }], ...over });

const cases: [string, KaiContext][] = [
  ['A1 es · first visit', base],
  ['A1 es · later opening, 12 due', { ...base, firstVisit: false, words, history: [{ from: 'kai', text: '¡Hola Maya! 👋 Soy **Kai**.' }, { from: 'user', text: 'Hola' }] }],
  ['A1 es · writes in English', said('what does propina mean?')],
  ['A1 es · asks to speak English', said('Please speak English with me, I do not understand')],
  ['A1 es · says something about self', said('I start a new job in a coffee shop in March')],
  ['A1 es · wants to practice', said('Vamos a practicar')],
  ['A1 es · off topic', said('Can you write me a Python script to sort a list?')],
  ['A1 es · asks goal-free small talk', said('Hola Kai, ¿cómo estás?')],
  ['B1 es · first visit', { ...base, cefr: 'B1', knownWords: 1800 }],
  ['B1 es · later opening', { ...base, cefr: 'B1', firstVisit: false, words, notes: ['Trip to Mexico City in May'], history: [{ from: 'kai', text: '¡Hola!' }] }],
  ['B1 es · culture question', said('¿Es normal dejar propina en México?', { cefr: 'B1' })],
  ['B1 es · grammar question', said('¿Cuál es la diferencia entre ser y estar?', { cefr: 'B1' })],
  ['C1 es · first visit', { ...base, cefr: 'C1', knownWords: 4500 }],
  ['C1 es · nuance', said('¿Qué matiz hay entre "propina" y "gratificación"?', { cefr: 'C1' })],
  ['C1 es · later opening, nothing due', { ...base, cefr: 'C1', firstVisit: false, words: { ...words, dueNow: 0 }, history: [{ from: 'kai', text: 'Buenas.' }] }],
  ['A1 fa→en · first visit', { ...base, name: 'Hamid', learningLanguage: 'English', nativeLanguage: 'Persian' }],
  ['A1 en→fa · first visit', { ...base, name: 'Sara', learningLanguage: 'Persian', nativeLanguage: 'English' }],
  ['A1 en→fa · question', said('how do I say thank you?', { name: 'Sara', learningLanguage: 'Persian', nativeLanguage: 'English', words: { ...words, sample: [{ word: 'سلام', translation: 'hello' }] }, history: [{ from: 'kai', text: 'سلام سارا! 👋' }] })],
  ['B1 en→ja · later opening', { ...base, name: 'Tom', cefr: 'B1', learningLanguage: 'Japanese', nativeLanguage: 'English', firstVisit: false, words: { ...words, sample: [{ word: '食べる', translation: 'to eat' }] }, history: [{ from: 'kai', text: 'こんにちは！' }] }],
  ['A2 de · memory used', said('What should I learn next?', { cefr: 'A2', learningLanguage: 'German', notes: ['Starts a job in a café in March', 'Likes football'], words: { ...words, sample: [{ word: 'der Kaffee', translation: 'the coffee' }] }, history: [{ from: 'kai', text: 'Hallo Maya! 👋' }] })],
];

let bad = 0;
for (const [name, ctx] of cases) {
  const t0 = Date.now();
  try {
    const raw = await kai.answer(ctx);
    const parsed = KaiAnswerSchema.safeParse(raw);
    console.log(`\n=== ${name} (${Date.now() - t0} ms) ${parsed.success ? 'OK' : 'WRONG SHAPE'}`);
    if (!parsed.success) { bad++; console.log(JSON.stringify(raw)?.slice(0, 600)); continue; }
    for (const l of parsed.data.lines) console.log(`  ${l.text}\n      ↳ ${l.translation}`);
    console.log(`  options=${JSON.stringify(parsed.data.options)} action=${parsed.data.action} remember=${JSON.stringify(parsed.data.remember)}`);
  } catch (e) {
    bad++;
    console.log(`\n=== ${name} (${Date.now() - t0} ms) FAILED ${(e as Error).message}`);
  }
}
console.log(`\n${cases.length - bad} / ${cases.length} good`);
