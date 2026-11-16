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
