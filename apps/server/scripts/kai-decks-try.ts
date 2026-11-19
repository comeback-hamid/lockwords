// Real AI check for decks in the New words chat: asks the real model for idea sets and prints them to read by hand
// (level, interest fit, title language, a sensible size from 10 to 30), plus the moments around them.
// Run from apps/server: ANTHROPIC_API_KEY=... npx tsx scripts/kai-decks-try.ts
import { claudeKaiChat } from '../src/llm/claude.js';
import { KaiAnswerSchema, type KaiContext } from '../src/llm/kai-chat.js';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
const kai = claudeKaiChat(key);

const base: KaiContext = {
  name: 'Maya', learningLanguage: 'Spanish', nativeLanguage: 'English', cefr: 'A1', knownWords: 150, goal: 'travel', goalOther: null, interests: ['food', 'music'],
  notes: [], history: [], words: { total: 10, reviewedLastDay: 0, dueNow: 10, sample: [{ word: 'la propina', translation: 'the tip' }] }, opening: false, firstVisit: false, userText: null,
  decks: { newWordsLeft: 10, topics: ['Ordering food'], offered: [] },
};
const asked = [{ from: 'kai' as const, text: '¡Hola! 👋 Tengo **3 mazos** listos para ti. ¿Quieres verlos?' }];
const level = (cefr: string, knownWords: number, over: Partial<KaiContext> = {}): KaiContext => ({ ...base, cefr, knownWords, ...over });

const cases: [string, KaiContext][] = [
  // 10 idea sets: A1, B1, C1, with different goals, interests and languages.
  ['A1 es · travel, food+music · yes', level('A1', 150, { history: asked, userText: 'Sí, quiero verlos' })],
  ['A1 es · family, cooking · asks for words', level('A1', 300, { goal: 'family_friends', interests: ['cooking', 'kids'], userText: 'I want new words', decks: { newWordsLeft: 2, topics: ['Family dinner'], offered: [] } })],
  ['A1 fa→en · work, tech · yes', level('A1', 200, { name: 'Hamid', learningLanguage: 'English', nativeLanguage: 'Persian', goal: 'work', interests: ['technology', 'football'], history: [{ from: 'kai', text: 'Hi Hamid! 👋 I have **3 decks** ready for you. Want to see them?' }], userText: 'yes' })],
  ['B1 es · travel, note: Mexico City in May · yes', level('B1', 1800, { notes: ['Trip to Mexico City in May'], history: asked, userText: 'Sí, enséñamelos' })],
  ['B1 es · work, business+tech · suggestion', level('B1', 2200, { goal: 'work', interests: ['business', 'technology'], userText: 'Dame una sugerencia', decks: { newWordsLeft: 0, topics: ['In a meeting', 'Writing emails'], offered: ['Job interview'] } })],
  ['B1 de · move abroad, sports · yes', level('B1', 2000, { learningLanguage: 'German', goal: 'move_abroad', interests: ['sports', 'nature'], history: [{ from: 'kai', text: 'Hallo Maya! 👋 Ich habe **3 Decks** für dich. Möchtest du sie sehen?' }], userText: 'Ja, gern', decks: { newWordsLeft: 4, topics: ['Renting a home'], offered: [] } })],
  ['B1 es · few new words left, practiced, opens the chat', level('B1', 1800, { opening: true, history: [{ from: 'kai', text: '¡Hola! 👋' }, { from: 'user', text: 'Hola' }], words: { total: 30, reviewedLastDay: 26, dueNow: 3, sample: [] }, decks: { newWordsLeft: 2, topics: ['Ordering food', 'At the hotel'], offered: [] } })],
  ['C1 es · work, law+politics · yes', level('C1', 4600, { goal: 'work', interests: ['law', 'politics'], history: asked, userText: 'Sí, claro' })],
  ['C1 es · brain, literature+film · suggestion', level('C1', 4800, { goal: 'brain', interests: ['literature', 'film'], userText: 'Sugiéreme mazos nuevos', decks: { newWordsLeft: 0, topics: ['Describing people'], offered: [] } })],
  ['C1 en→ja · travel, food · yes', level('C1', 4500, { name: 'Tom', learningLanguage: 'Japanese', nativeLanguage: 'English', history: [{ from: 'kai', text: 'こんにちは、トム！👋 **3つのデッキ**を用意しました。見ますか？' }], userText: 'はい、見たいです' })],
  // Around the ideas.
  ['A1 es · FIRST VISIT (must ask first, no decks)', level('A1', 150, { opening: true, firstVisit: true, words: { total: 10, reviewedLastDay: 0, dueNow: 10, sample: [] } })],
  ['A1 es · later opening, many new words (should NOT offer)', level('A1', 150, { opening: true, history: [{ from: 'kai', text: '¡Hola! 👋' }], decks: { newWordsLeft: 18, topics: ['Ordering food'], offered: [] } })],
  ['A1 es · own deck, clear (1 idea)', level('A1', 150, { userText: 'I start a job in a coffee shop next month. Can you make me a deck for that? Single words please.' })],
  ['B1 es · own deck, vague (may ask ONE question)', level('B1', 1800, { userText: 'Quiero un mazo para mi trabajo' })],
  ['B1 es · own deck, after the one question', level('B1', 1800, { history: [{ from: 'user', text: 'Quiero un mazo para mi trabajo' }, { from: 'kai', text: '¡Claro! 💼 ¿En qué trabajas?' }], userText: 'Soy enfermera en un hospital' })],
  ['B1 es · own deck with a number (25)', level('B1', 1800, { userText: 'Hazme un mazo de 25 palabras sobre el fútbol' })],
  ['A1 es · deck is ready (event)', level('A1', 150, { event: { deckReady: { title: 'Pedir comida y pagar la cuenta.', wordCount: 12 } } })],
  ['A1 es · make another deck', level('A1', 150, { history: [{ from: 'kai', text: '¡Tu mazo está **listo**! 🎉 Ya está en **Review**.' }], userText: 'Hacer otro mazo' })],
  ['A1 es · small talk (no decks)', level('A1', 150, { userText: 'Hola Kai, ¿cómo estás?' })],
];

let bad = 0;
for (const [name, ctx] of cases) {
  const t0 = Date.now();
  try {
    const raw = await kai.answer(ctx);
    const parsed = KaiAnswerSchema.safeParse(raw);
    console.log(`\n=== ${name} (${Date.now() - t0} ms) ${parsed.success ? 'OK' : 'WRONG SHAPE'}`);
    if (!parsed.success) { bad++; console.log(JSON.stringify(raw)?.slice(0, 900)); continue; }
    for (const l of parsed.data.lines) console.log(`  ${l.text}\n      ↳ ${l.translation}`);
    console.log(`  options=${JSON.stringify(parsed.data.options)} action=${parsed.data.action}`);
    for (const d of parsed.data.decks ?? []) console.log(`  DECK ${String(d.wordCount).padStart(2)} · "${d.title}" (${d.titleTranslation}) · reason: ${d.reason} · topic: ${d.topic}`);
  } catch (e) {
    bad++;
    console.log(`\n=== ${name} (${Date.now() - t0} ms) FAILED ${(e as Error).message}`);
  }
}
console.log(`\n${cases.length - bad} / ${cases.length} good`);
