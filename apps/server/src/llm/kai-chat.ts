import { z } from 'zod';

import { fixtureDecks, type DeckFacts, type DeckReady } from '../kai/abilities/decks.js';
import { abilities, abilityAnswer, words } from '../kai/abilities/index.js';

// AI task: one turn of the New words chat. Kai answers as an agent that knows and remembers the learner.
// Later abilities (decks, word cards) add optional fields to the answer; see src/kai/abilities/.

export type KaiContext = {
  name: string | null;
  learningLanguage: string;
  nativeLanguage: string;
  cefr: string | null;
  knownWords: number | null;
  goal: string;
  goalOther: string | null;
  interests: string[];
  notes: string[]; // what Kai saved about the learner before
  history: { from: 'kai' | 'user'; text: string }[]; // the newest messages, oldest first
  words: { total: number; reviewedLastDay: number; dueNow: number; sample: { word: string; translation: string }[] };
  opening: boolean; // Kai speaks first (the learner just opened the tab)
  firstVisit: boolean;
  userText: string | null; // null on an opening
  decks?: DeckFacts; // ability "decks": what the learner has and was offered
  event?: { deckReady: DeckReady }; // ability "decks": something happened in the app that Kai speaks about (no learner text)
};

export const MAX_LINES = 3;
export const MAX_LINE_CHARS = 160;
export const MAX_OPTIONS = 3;
export const MAX_OPTION_CHARS = 30;
export const MAX_NOTE_CHARS = 200;
export const MAX_NOTES_PER_TURN = 5;
export const MAX_TRANSLATION_CHARS = 300;

export const KaiAnswerSchema = z.object({
  lines: z
    .array(z.object({
        text: z.string().trim().min(1).max(MAX_LINE_CHARS),
        // Shown as small plain text, so bold marks the model adds anyway are taken out.
        translation: z
          .string()
          .transform((t) => t.replaceAll('**', '').trim().slice(0, MAX_TRANSLATION_CHARS))
          .pipe(z.string().min(1)),
      }))
    .min(1)
    .max(MAX_LINES),
  options: z.array(z.string().trim().min(1).max(MAX_OPTION_CHARS)).max(MAX_OPTIONS).default([]),
  // Notes are extra. A bad one (not text, empty, too long, too many) is cut or dropped; it never fails Kai's lines.
  remember: z
    .unknown()
    .optional()
    .transform((r) =>
      (Array.isArray(r) ? r : [])
        .filter((n): n is string => typeof n === 'string')
        .map((n) => n.trim().slice(0, MAX_NOTE_CHARS))
        .filter((n) => n !== '')
        .slice(0, MAX_NOTES_PER_TURN),
    ),
  // Only "review" means something. Anything else the model invents is dropped.
  action: z
    .unknown()
    .optional()
    .transform((a) => (a === 'review' ? ('review' as const) : null)),
  // A word card (src/kai/abilities/words.ts). A word with a bad or missing field fails the whole answer.
  word: words.KaiWordSchema.nullish().transform((w) => w ?? undefined),
  ...abilityAnswer,
});
export type KaiAnswer = z.infer<typeof KaiAnswerSchema>;

// The raw answer. The service checks it with KaiAnswerSchema and asks once more when the shape is wrong.
// `deadline` (a clock time in ms) is when the whole turn must be done; a real call spends no longer than what is left.
export type KaiChat = { answer(ctx: KaiContext, deadline?: number): Promise<unknown> };

const isBeginner = (cefr: string | null) => cefr === null || /^A[12]/.test(cefr);

export function buildKaiPrompt(c: KaiContext): { system: string; user: string } {
  const L = c.learningLanguage;
  const N = c.nativeLanguage;
  const level = c.cefr ?? 'A1';
  const system = [
    `You are Kai, the friendly tutor inside Lockwords, a flashcard app. You chat with one learner on the "New words" tab.`,
    `The learner speaks ${N} and is learning ${L}. Their level is CEFR ${level}.`,
    ``,
    `How you write:`,
    `- 1 to ${MAX_LINES} short lines. Each line is its own chat bubble and has at most ${MAX_LINE_CHARS} characters. Be brief: most answers need 1 or 2 lines.`,
    `- Write in ${L}, with words and grammar a CEFR ${level} learner can read. For A1 and A2 use very simple, short sentences.`,
    `- Use an emoji in most lines and put the key words in **bold** (markdown).`,
    `- Give every line a "translation": the same line in ${N}, plain text, no markdown.`,
    `- Answer in ${L} even when the learner writes in ${N}. Switch to ${N} only when the learner asks you to, and go back to ${L} when they ask for that. When you write a line in ${N}, its "translation" is the same text.`,
    `- Be warm and friendly, like a good friend who teaches. Use the learner's name now and then, not in every line.`,
    ``,
    `What you do:`,
    `- You help only with language learning: words, meaning, grammar, how to say things, culture around the language, and their practice in this app. If they ask for anything else, say kindly in one line that you only help with ${L}, and bring them back.`,
    `- Stay close to the learner's own words, level, goal and interests. You can praise what they practiced, tell one short thing about one of their words (meaning, use, a culture point), or say it is time to practice.`,
    `- Never ask the learner what their goal is. You may guess it from what they say.`,
    `- Do not offer decks or new word lists on every visit.`,
    `- "options": 0 to ${MAX_OPTIONS} short replies the learner can tap (at most ${MAX_OPTION_CHARS} characters each, in ${L}, written as the learner would say them). Give options only when they help. Give none for an open question (like asking a name) or when the learner should just type.`,
    `- When the learner wants to practice or review now, set "action" to "review" and say in one line that you take them to Review. Otherwise leave "action" null. The app opens the Review tab by itself.`,
    `- "remember": short notes in English (at most ${MAX_NOTE_CHARS} characters each) about new facts the learner told you about themselves: a goal, a plan, an interest, a preference (for example that they asked you to speak ${N}). Only new facts the learner said in this chat that are not in your notes yet. Never save what you were already given below (name, level, goal, interests, word counts). Usually this is empty.`,
    ...abilities.flatMap((a) => a.rules(c)),
    ``,
    ...words.wordPromptPart(L, N),
    ``,
    `Answer with JSON only, in this shape:`,
    `{"lines": [{"text": string, "translation": string}], "options": string[], "remember": string[], "action": "review" | null, ${words.WORD_SHAPE}${abilities.map((a) => `, ${a.shape}`).join('')}}`,
  ].join('\n');

  const who = [
    `Learner: ${c.name ?? '(name not known)'}. Goal: ${c.goal}${c.goalOther ? ` (${c.goalOther})` : ''}. Interests: ${c.interests.join(', ') || 'none saved'}.`,
    c.knownWords === null ? null : `They know about ${c.knownWords} ${L} words.`,
    `Your notes about them: ${c.notes.length ? c.notes.map((n) => `\n- ${n}`).join('') : 'none yet.'}`,
    `Their words in the app: ${c.words.total} in total, ${c.words.reviewedLastDay} reviewed in the last 24 hours, ${c.words.dueNow} due for review now.`,
    c.words.sample.length ? `Some of their words (hard ones first): ${c.words.sample.map((w) => `${w.word} (${w.translation})`).join('; ')}.` : null,
    ...abilities.flatMap((a) => a.facts(c)),
  ].filter((l): l is string => l !== null);

  const history = c.history.length ? ['', 'The chat so far (oldest first):', ...c.history.map((m) => `${m.from === 'kai' ? 'Kai' : 'Learner'}: ${m.text}`)] : [];

  const base = c.opening
    ? c.firstVisit
      ? [
          '',
          `This is the learner's first visit to this chat. Open it: say hello, say who you are, and say in simple words that you help them find words that fit their level and their goals.`,
          ...(isBeginner(c.cefr) ? [`Also tell them they may write in ${N} whenever they want.`] : []),
          `End with something they can answer.`,
        ]
      : ['', `The learner just opened the chat again. Greet them in a fresh way that fits what you know: their practice, one of their words, or a nudge to review if words are due. Do not repeat your last greeting.`]
    : ['', `The learner now says: ${c.userText ?? ''}`];
  const now = abilities.reduce((lines, a) => a.now?.(c, lines) ?? lines, base);

  return { system, user: [...who, ...history, ...now].join('\n') };
}

// Stands in for the model in tests and in local runs with no ANTHROPIC_API_KEY. Always Spanish, like the fixture deck.
const wantsPractice = /practic|repas|review/i;
const aboutMe = /\b(i am|i'm|i work|i like|i love|i live|i start|soy|trabajo|me gusta|vivo)\b/i;
export const fixtureKaiChat: KaiChat = {
  answer: async (c) => {
    if (c.opening && c.firstVisit)
      return {
        lines: [
          { text: `¡Hola${c.name ? ` ${c.name}` : ''}! 👋 Soy **Kai**.`, translation: `Hi${c.name ? ` ${c.name}` : ''}! I'm Kai.` },
          { text: 'Te ayudo a encontrar palabras para **tu nivel** y **tus metas**.', translation: 'I help you find words for your level and your goals.' },
          { text: 'Tengo **3 mazos** listos para ti. ¿Quieres verlos? 👀', translation: 'I have 3 decks ready for you. Want to see them?' },
        ],
        options: ['Sí, quiero verlos', 'Ahora no'],
      };
    if (c.opening)
      return {
        lines: [
          { text: `¡Hola de nuevo! 👋 Tienes **${c.words.dueNow} palabras** para hoy.`, translation: `Hi again! You have ${c.words.dueNow} words for today.` },
          { text: '¿Practicamos? 💪', translation: 'Shall we practice?' },
        ],
        options: ['Vamos a practicar', 'Ahora no'],
      };
    const decks = fixtureDecks(c);
    if (decks) return decks;
    const text = c.userText ?? '';
    const card = words.fixtureWordAnswer(text);
    if (card) return card;
    if (wantsPractice.test(text)) return { lines: [{ text: '¡Perfecto! Te llevo a **Review**… 🚀', translation: 'Great! Taking you to Review…' }], action: 'review' };
    return {
      lines: [{ text: '¡Qué interesante! 🙂 Cuéntame **más**.', translation: 'How interesting! Tell me more.' }],
      options: ['Vamos a practicar'],
      remember: aboutMe.test(text) ? [`Said: ${text.slice(0, 180)}`] : [],
    };
  },
};
