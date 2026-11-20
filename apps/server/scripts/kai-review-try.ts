// Real AI check for one rule of the New words chat: Kai takes the learner to Review only when they ask for it.
// Run from apps/server: ANTHROPIC_API_KEY=... npx tsx scripts/kai-review-try.ts
import { claudeKaiChat } from '../src/llm/claude.js';
import { KaiAnswerSchema, type KaiContext } from '../src/llm/kai-chat.js';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
const kai = claudeKaiChat(key);

// A learner with 10 new cards waiting, as in the report of 2026-11-19.
const words = { total: 10, reviewedLastDay: 0, dueNow: 10, sample: [{ word: 'la propina', translation: 'the tip' }, { word: 'la cuenta', translation: 'the bill' }, { word: 'pedir', translation: 'to order' }] };
const base: KaiContext = {
  name: 'Maya', learningLanguage: 'Spanish', nativeLanguage: 'English', cefr: 'A1', knownWords: 150, goal: 'travel', goalOther: null, interests: ['food', 'music'],
  notes: [], history: [{ from: 'kai', text: '¡Hola Maya! 👋 Soy **Kai**.' }], words, opening: false, firstVisit: false, userText: null,
};
const said = (userText: string, over: Partial<KaiContext> = {}): KaiContext => ({ ...base, userText, ...over });
const offered: KaiContext['history'] = [{ from: 'kai', text: 'Tienes **10 palabras** para hoy. ¿Practicamos? 💪' }];

// [what the learner does, the context, should the app go to Review?]
const cases: [string, KaiContext, boolean][] = [
  ['greeting "Hola Kai"', said('Hola Kai'), false],
  ['greeting "Hola"', said('Hola'), false],
  ['small talk', said('Hola Kai, ¿cómo estás?'), false],
  ['small talk in English', said('hi! how are you today?'), false],
  ['a question about a word', said('what does propina mean?'), false],
  ['says something about self', said('I start a new job in a coffee shop in March'), false],
  ['thanks', said('gracias'), false],
  ['no to the offer', said('Ahora no', { history: offered }), false],
  ['asks to practice', said('Vamos a practicar'), true],
  ['asks to review in English', said('I want to review my words now'), true],
  ['yes to the offer', said('Sí', { history: offered }), true],
  ['yes to the offer, in words', said('ok, let’s do it', { history: offered }), true],
];

let wrong = 0;
for (const [name, ctx, review] of cases) {
  for (let run = 1; run <= 2; run++) {
    try {
      const answer = KaiAnswerSchema.parse(await kai.answer(ctx, Date.now() + 20_000));
      const ok = (answer.action === 'review') === review;
      if (!ok) wrong++;
      console.log(`${ok ? 'ok   ' : 'WRONG'} ${name} (${run}) → action ${answer.action ?? 'null'} · ${answer.lines.map((l) => l.text).join(' / ')}${answer.options.length ? ` · options: ${answer.options.join(' | ')}` : ''}`);
    } catch (e) {
      wrong++;
      console.log(`ERROR ${name} (${run}) → ${e instanceof Error ? e.message.slice(0, 120) : 'failed'}`);
    }
  }
}
console.log(`\n${cases.length * 2 - wrong} of ${cases.length * 2} as expected`);
process.exit(wrong ? 1 : 0);
