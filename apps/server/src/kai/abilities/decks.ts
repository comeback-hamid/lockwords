import { z } from 'zod';

import type { KaiContext } from '../../llm/kai-chat.js';
import type { Ability } from './index.js';

// Kai's ability to offer decks in the New words chat: 3 ideas of its own, or 1 from the learner's own idea.
// The ideas ride on Kai's answer, are saved as proposed decks, and show as deck cards under Kai's last line.
// When a deck is made, the app sends the "deck_ready" event and Kai says so, once per deck.

export const MIN_DECK_WORDS = 10;
export const MAX_DECK_WORDS = 30;
export const MAX_TOPIC_CHARS = 80;
export const MAX_TITLE_CHARS = 120;
export const MAX_REASON_CHARS = 30;
export const FEW_NEW_WORDS = 10; // fewer new words than this: Kai may offer ideas by itself

// A model counts characters badly. A text that is a little too long is cut at a word, not thrown away with the whole turn.
// (The real AI check of 2026-11-18: 9 of 12 idea sets had a topic of 81 to 110 characters.)
const upTo = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((s) => (s.length <= max ? s : s.slice(0, max + 1).replace(/\s+\S*$/, '').slice(0, max).replace(/[\s,;:·-]+$/, '') || s.slice(0, max)));

export const DeckIdeaSchema = z.object({
  topic: upTo(MAX_TOPIC_CHARS), // what the word maker is asked for
  title: upTo(MAX_TITLE_CHARS), // in the learning language
  titleTranslation: upTo(MAX_TITLE_CHARS * 2), // in the native language
  reason: upTo(MAX_REASON_CHARS),
  wordCount: z.number().int().min(MIN_DECK_WORDS).max(MAX_DECK_WORDS),
});
export type DeckIdea = z.infer<typeof DeckIdeaSchema>;

// 3 ideas (Kai's), 1 (the learner's own) or none. Any other number is a wrong answer, like a wrong shape.
export const DeckIdeasSchema = z
  .array(DeckIdeaSchema)
  .refine((d) => d.length === 0 || d.length === 1 || d.length === 3, 'send 1 or 3 deck ideas')
  .nullish()
  .transform((d) => (d?.length ? d : undefined));

// What Kai is told about the learner's decks.
export type DeckFacts = {
  newWordsLeft: number; // cards at stage 0 the learner can still meet
  topics: string[]; // decks they have (made or being made)
  offered: string[]; // ideas shown before and not made
};
export const NO_DECK_FACTS: DeckFacts = { newWordsLeft: 0, topics: [], offered: [] };
export type DeckReady = { title: string; wordCount: number };
export type DeckEvent = { event: 'deck_ready'; deckId: string };

// A deck as a chat message shows it.
export type ChatDeck = { id: string; title: string; titleTranslation: string | null; reason: string; cefr: string; wordCount: number; status: 'proposed' | 'generating' | 'ready'; current: boolean };
type DeckRow = { id: string; title: string; titleTranslation?: string | null; reason: string; cefr: string; wordCount: number; status: string };

// The decks of one message, in the order they were offered. `current` = this message is the newest one that has decks.
export function toChatDecks(deckIds: readonly string[], byId: ReadonlyMap<string, DeckRow>, current: boolean): ChatDeck[] {
  return deckIds.flatMap((id) => {
    const d = byId.get(id);
    if (!d) return [];
    return [{ id: d.id, title: d.title, titleTranslation: d.titleTranslation ?? null, reason: d.reason, cefr: d.cefr, wordCount: d.wordCount, status: d.status as ChatDeck['status'], current }];
  });
}

// The "deck_ready" event: the deck must be the caller's and ready, and Kai speaks about it once.
type ReadyDeps = { decks?: { get(userId: string, id: string): Promise<(DeckRow & { title: string }) | null> }; kai: { saidReady?(userId: string, deckId: string): Promise<boolean> } };
export async function readyEvent(deps: ReadyDeps, userId: string, deckId: string): Promise<DeckReady | 'not_found' | 'deck_not_ready' | 'said'> {
  const deck = z.uuid().safeParse(deckId).success ? await deps.decks?.get(userId, deckId) : null;
  if (!deck) return 'not_found'; // also another user's deck: callers cannot tell them apart
  if (deck.status !== 'ready') return 'deck_not_ready';
  if (await deps.kai.saidReady?.(userId, deckId)) return 'said';
  return { title: deck.title, wordCount: deck.wordCount };
}

// Kai reads its own history as text. A line that showed deck cards says which, so Kai knows what the learner saw.
export const deckNote = (decks: readonly ChatDeck[] | undefined) =>
  decks?.length ? ` [deck cards shown: ${decks.map((d) => `"${d.title}" (${d.wordCount} words, ${d.status === 'ready' ? 'made' : 'not made'})`).join(', ')}]` : '';

const list = (items: readonly string[]) => (items.length ? items.map((t) => `"${t}"`).join('; ') : 'none');

export const decksAbility = {
  answer: { decks: DeckIdeasSchema },
  shape: `"decks": [{"topic": string, "title": string, "titleTranslation": string, "reason": string, "wordCount": number}] (optional)`,
  rules: (c: KaiContext) => {
    const L = c.learningLanguage;
    const N = c.nativeLanguage;
    return [
      ``,
      `Decks (sets of new words you can make for the learner):`,
      `- To offer decks, put them in "decks": exactly 3 ideas when they are your suggestions, exactly 1 when the learner asked for their own deck. In every other answer leave "decks" out. Never send 2.`,
      `- The app shows each idea as a card with a button named Generate under your last line. So do not list the titles in your lines. Say something short (like "Look, 3 decks for you") and that they can tap Generate on one, or tell you their own idea. Always write the button's name as "Generate", never translated.`,
      `- Each idea has: "topic" (in English, 3 to 8 words, at most 60 characters: what the deck is about, concrete, with the learner's own wish in it, like "Ordering coffee as a barista"), "title" (in ${L}: one short sentence that says what they will be able to do, at most 60 characters), "titleTranslation" (the title in ${N}), "reason" (in ${L}, 2 to 4 words, at most 25 characters: why it fits them, like "For your trip") and "wordCount".
- "wordCount": you pick the size of each deck, from ${MIN_DECK_WORDS} to ${MAX_DECK_WORDS} words, by how wide the topic is and what the learner asked for. A narrow topic gets 10 to 15, a wide one 20 to 30. A deck for a beginner (A1 or A2) is small: 10 to 15. If the learner names a number, use it (inside ${MIN_DECK_WORDS} to ${MAX_DECK_WORDS}).`,
      `- When to offer your 3 ideas: when the learner asks for new words, a deck or suggestions, or says yes to seeing your decks; or by yourself when they have practiced and have fewer than ${FEW_NEW_WORDS} new words left (see below). Not on every visit.`,
      `- The ideas fit the learner's level, goal, interests and your notes, and are different from each other. Never repeat a topic of a deck they already have or of an idea you already offered (both listed below).`,
      `- The learner's own deck: when they tell you what they need (a topic, a situation, a text), make 1 idea from it. If something important is not clear, ask at most ONE short question first, with options to tap (for example: single words, or phrases?), and show the card in your next answer. Never ask a second question.`,
      `- There is no button for their own deck, so say now and then that they can ask you for their own deck.`,
      `- When the learner wants another deck and did not say which, ask: a suggestion from you, or their own idea? Give these two as options.`,
    ];
  },
  facts: (c: KaiContext) => {
    const d = c.decks ?? NO_DECK_FACTS;
    return [`New words they have not practiced yet: ${d.newWordsLeft}.`, `Topics of the decks they have: ${list(d.topics)}.`, `Ideas you offered before that they did not make: ${list(d.offered)}.`];
  },
  now: (c: KaiContext, lines: string[]) => {
    const ready = c.event?.deckReady;
    if (ready)
      return [
        '',
        `The deck "${ready.title}" (${ready.wordCount} words) that the learner asked you to make is ready now. Its words are in their word list and in Review already; there is nothing more to add.`,
        `Tell them in 1 or 2 short lines that the deck is ready and is in Review now, and ask if they want to practice now. Give exactly two options: one to practice now, one to make another deck. Do not send "decks" and leave "action" null.`,
      ];
    if (c.opening && c.firstVisit)
      return [...lines, `End by telling them you have 3 decks ready for them and asking if they want to see them, with two options (yes, and not now). Do not send "decks" in this answer: the cards come only after they say yes.`];
    return lines;
  },
} satisfies Ability;

// ---- The stand-in Kai (tests, and local runs with no key). Spanish, like the fixture deck. ----
const IDEAS: DeckIdea[] = [
  { topic: 'Ordering food', title: 'Pedir comida, pagar la cuenta y dejar propina.', titleTranslation: 'Order food, pay the bill and leave a tip.', reason: 'Para tu viaje', wordCount: 12 },
  { topic: 'Getting around the city', title: 'Pedir direcciones, comprar un boleto y tomar el metro.', titleTranslation: 'Ask for directions, buy a ticket and take the metro.', reason: 'Elegiste Viajes', wordCount: 20 },
  { topic: 'At the hotel', title: 'Llegar al hotel y pedir lo que necesitas.', titleTranslation: 'Arrive at the hotel and ask for what you need.', reason: 'Para tu viaje', wordCount: 15 },
  { topic: 'Meeting new people', title: 'Saludar, presentarte y hacer planes.', titleTranslation: 'Say hello, introduce yourself and make plans.', reason: 'Para hablar más', wordCount: 10 },
  { topic: 'Shopping at the market', title: 'Comprar fruta y preguntar el precio.', titleTranslation: 'Buy fruit and ask the price.', reason: 'Te gusta la comida', wordCount: 14 },
  { topic: 'Seeing a doctor', title: 'Decir qué te duele y entender al médico.', titleTranslation: 'Say what hurts and understand the doctor.', reason: 'Por si acaso', wordCount: 18 },
  { topic: 'At the airport', title: 'Facturar la maleta y encontrar tu puerta.', titleTranslation: 'Check in your bag and find your gate.', reason: 'Para tu viaje', wordCount: 16 },
  { topic: 'Small talk', title: 'Hablar del tiempo y del fin de semana.', titleTranslation: 'Talk about the weather and the weekend.', reason: 'Para hablar más', wordCount: 30 },
  { topic: 'At the café', title: 'Pedir un café y algo dulce.', titleTranslation: 'Order a coffee and something sweet.', reason: 'Te gusta la comida', wordCount: 10 },
];
const wantsIdeas = /quiero ver|sugerencia|suggest|show me|otras ideas|palabras nuevas|new words/i;
const wantsAnother = /otro mazo|another deck/i;
const ownIdea = /propia idea|own idea/i;
const ownDeck = /(?:mazo|deck)\s+(?:sobre|para|de|about|for|on)\s+(.+)/i;

// The deck parts of the stand-in's answers, or null when the turn is not about decks.
export function fixtureDecks(c: KaiContext): unknown {
  if (c.event?.deckReady)
    return {
      lines: [
        { text: '¡Tu mazo está **listo**! 🎉 Ya está en **Review**.', translation: 'Your deck is ready! It is in Review now.' },
        { text: '¿Practicamos ahora? 💪', translation: 'Shall we practice now?' },
      ],
      options: ['Vamos a practicar', 'Hacer otro mazo'],
    };
  const text = c.userText ?? '';
  const own = ownDeck.exec(text);
  if (own) {
    const topic = own[1]!.trim().replace(/[.!?]+$/, '').slice(0, MAX_TOPIC_CHARS);
    return {
      lines: [{ text: '¡Claro! 🙌 Toca **Generate** y lo hago.', translation: 'Sure! Tap Generate and I will make it.' }],
      decks: [{ topic, title: `Palabras para: ${topic}`.slice(0, MAX_TITLE_CHARS), titleTranslation: `Words for: ${topic}`, reason: 'Tu propia idea', wordCount: 12 }],
    };
  }
  if (wantsAnother.test(text)) return { lines: [{ text: '¡Claro! 😊 ¿Una **sugerencia**, o **tu propia idea**?', translation: 'Sure! A suggestion, or your own idea?' }], options: ['Una sugerencia', 'Mi propia idea'] };
  if (ownIdea.test(text)) return { lines: [{ text: '¡Perfecto! ✍️ Dime qué **necesitas**. Por ejemplo: un mazo sobre el trabajo.', translation: 'Great! Tell me what you need. For example: a deck about work.' }] };
  if (wantsIdeas.test(text)) {
    const had = new Set([...(c.decks?.topics ?? []), ...(c.decks?.offered ?? [])]);
    const fresh = IDEAS.filter((i) => !had.has(i.topic));
    return {
      lines: [
        { text: 'Mira, **3 mazos** para ti 👇', translation: 'Look, 3 decks for you' },
        { text: 'Toca **Generate** en uno, o dime **tu propia idea** 💡', translation: 'Tap Generate on one, or tell me your own idea' },
      ],
      decks: (fresh.length >= 3 ? fresh : IDEAS).slice(0, 3),
    };
  }
  return null;
}
