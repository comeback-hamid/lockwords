import type { KaiReplier } from './kai-reply.js';
import type { DeckMaker } from './make-deck.js';
import type { UseItJudge } from './use-it.js';

// Stands in for the model in tests and in local runs with no ANTHROPIC_API_KEY. Always the same Spanish deck.
const TITLES: Record<string, string> = {
  'Ordering food': 'Order food, pay and tip in restaurants.',
  'Getting around the city': 'Ask the way, buy tickets and ride the metro.',
  'Meeting new people': 'Say hello, introduce yourself and make plans.',
  'At the hotel': 'Check in, ask for things and fix small problems.',
};

export const fixtureDeckMaker: DeckMaker = {
  propose: async ({ topic }) => ({ title: TITLES[topic] ?? `Words for: ${topic}`, reason: 'For your goal' }),
  cards: async () => [
    { word: 'la cuenta', translation: 'the bill', example: '¿Nos trae la cuenta, por favor?', exampleTranslation: 'Can you bring us the bill, please?' },
    { word: 'la propina', translation: 'the tip', example: 'En tu viaje a Ciudad de México, deja un 10 % de propina.', exampleTranslation: 'On your trip to Mexico City, leave a 10% tip.' },
    { word: 'pedir', translation: 'to order', example: 'Quiero pedir una sopa.', exampleTranslation: 'I want to order a soup.' },
    { word: 'el camarero', translation: 'the waiter', example: 'El camarero es muy amable.', exampleTranslation: 'The waiter is very kind.' },
    { word: 'la carta', translation: 'the menu', example: '¿Puedo ver la carta?', exampleTranslation: 'Can I see the menu?' },
    { word: 'el plato', translation: 'the dish', example: 'Este plato está delicioso.', exampleTranslation: 'This dish is delicious.' },
    { word: 'la bebida', translation: 'the drink', example: '¿Qué bebida quieres?', exampleTranslation: 'What drink do you want?' },
    { word: 'reservar', translation: 'to book', example: 'Quiero reservar una mesa para dos.', exampleTranslation: 'I want to book a table for two.' },
    { word: 'el postre', translation: 'the dessert', example: 'De postre, quiero flan.', exampleTranslation: 'For dessert, I want flan.' },
    { word: 'pagar', translation: 'to pay', example: '¿Puedo pagar con tarjeta?', exampleTranslation: 'Can I pay by card?' },
  ],
};

// "Good" = the sentence contains the word without its article. Real feedback needs the model.
const ARTICLE = /^(el|la|los|las|un|una|the|a|an|le|les|der|die|das)\s+/i;
export const fixtureUseItJudge: UseItJudge = {
  check: async ({ word, sentence }) => {
    const bare = word.replace(ARTICLE, '');
    return sentence.toLowerCase().includes(bare.toLowerCase())
      ? { good: true, lines: ['🎉 **Great sentence!**', `👍 You used **${bare}** in the right place.`] }
      : { good: false, lines: [`🤔 I can’t find **${bare}** in your sentence.`, 'Try again with the word.'] };
  },
};

const languageName = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
};

// Kai's reply without a model: a question, or a long text that is not a name, is off the script.
const OFF = (line: string) => ({ onScript: false as const, lines: [line] });
export const fixtureKaiReplier: KaiReplier = {
  reply: async ({ step, text, options, nativeLanguage, learningLanguage }) => {
    const t = text.trim(), low = t.toLowerCase();
    const question = t.includes('?');
    if (step === 'proposed' || step === 'generating') return OFF('😊 Good question! I’ll tell you more once your **words** are ready.');
    if (step === 'name') {
      if (question || t.split(/\s+/).length > 4) return OFF('😊 So I can **greet you** by name!');
      const caps = t.split(/\s+/).filter((w) => /^\p{Lu}/u.test(w) && !/^I('|’)m$/.test(w));
      return { onScript: true, answer: (caps.at(-1) ?? t).replace(/[.,!]+$/, '').slice(0, 40) };
    }
    if (step === 'language') {
      const has = (name: string | undefined) => !!name && low.includes(name.toLowerCase());
      if (has(options[0]) || has(languageName(nativeLanguage))) return { onScript: true, answer: 'native' };
      if (has(options[1]) || has(languageName(learningLanguage))) return { onScript: true, answer: 'target' };
      return OFF('🙂 I can chat in **' + (options[0] ?? 'English') + '** or **' + (options[1] ?? 'Spanish') + '**.');
    }
    if (step === 'topic') return question ? OFF('💡 Any topic works: **food**, **travel**, **work**…') : { onScript: true, answer: t.slice(0, 80) };
    if (/practi|now|yes|let/.test(low)) return { onScript: true, answer: 'practice' };
    if (/word|first|see|look/.test(low)) return { onScript: true, answer: 'wordsFirst' };
    return OFF('💪 Practice now, or look at the **words** first?');
  },
};
