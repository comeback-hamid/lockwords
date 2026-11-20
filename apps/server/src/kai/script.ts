import { ideaTopics } from '../decks/ideas.js';

// Kai's fixed lines in the onboarding chat (O10–O10f), in English, by key. The app has the same English copy built
// in (apps/mobile/src/onboarding/kai-script.ts); other languages are translated from this one and kept.
// {name} and {language} are place holders. **word** = bold.
const LINES = {
  hi: 'Hi! I’m Kai 👋',
  askName: 'I’ll help you learn **{language}** words. What’s your name?',
  niceToMeet: 'Nice to meet you, **{name}**! 😊',
  whichLanguage: 'Which language should we chat in?',
  explain1: 'Here’s what I do ✨',
  explain2: '🃏 I make **decks** of words just for you',
  explain3: '👆 **Review** them with quick swipes',
  explain4: '💬 Use them in sentences with me',
  explain5: '🔒 Hard words go to your **lock screen**',
  explain6: 'Let’s start with **10 new words**. What do you want to learn? 🌮',
  goodChoice: 'Good choice! Here’s your first deck 👇',
  tapGenerate: 'Tap Generate and I will make it for you ✨',
  proposeFailed: 'I could not reach the server. Tap to try again.',
  picking: 'Picking the best words for your level… ⏳',
  generateFailed: 'That did not work. Tap Generate to try again.',
  ready: 'Your deck is **ready**! 🎉 Tap it any time to see the words.',
  practice: 'Shall we practice them now? 💪',
  backName: 'So, what’s your name? 😊',
  backTopic: 'So, what do you want to learn? 🌮',
  backProposed: 'Tap **Generate** when you’re ready ✨',
  backGenerating: 'Your words are almost ready ⏳',
  replyPractice: 'OK, let’s practice!',
  replyWordsFirst: 'Show me the words first',
  replyTryAgain: 'Try again',
} as const;

// The deck ideas (tap answers on O10c) are part of the script too, keyed by their English text.
export const ENGLISH_SCRIPT: Record<string, string> = { ...LINES, ...Object.fromEntries(ideaTopics().map((t) => [`idea:${t}`, t])) };
export const SCRIPT_KEYS = Object.keys(ENGLISH_SCRIPT);

const marks = (text: string) => [(text.match(/\{[a-z]+\}/g) ?? []).sort().join(), (text.match(/\*\*/g) ?? []).length].join('|');

// A translated script is good when it has every key, every text is short and not empty, and each line kept its
// place holders and bold marks.
export function goodScript(lines: unknown): lines is Record<string, string> {
  if (!lines || typeof lines !== 'object') return false;
  const got = lines as Record<string, unknown>;
  return SCRIPT_KEYS.every((key) => {
    const text = got[key];
    return typeof text === 'string' && text.trim().length > 0 && text.length <= 200 && marks(text) === marks(ENGLISH_SCRIPT[key]!);
  });
}

// "en", "English", "english " → English needs no translation.
export const isEnglish = (language: string) => ['en', 'english'].includes(language.trim().toLowerCase()) || language.trim().toLowerCase().startsWith('en-');
