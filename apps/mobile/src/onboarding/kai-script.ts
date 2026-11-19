import type { ProfileChat } from '@/api/client';
import type { KaiState } from '@/kai/states';

import type { LanguageChoice } from './store';

// Kai's lines for the onboarding chat (O10–O10f). **word** = bold.
// shortcut: English only; the chosen chat language is saved but not used until Kai's lines come from the server.
export type Step = 'name' | 'language' | 'topic' | 'proposed' | 'generating' | 'ready';
export type KaiPose = KaiState;

const POSE: Record<Step, KaiPose> = { name: 'greeting', language: 'idle', topic: 'idle', proposed: 'listening', generating: 'thinking', ready: 'celebrate' };
export const poseFor = (step: Step) => POSE[step];

export const openingLines = (language: string) => ['Hi! I’m Kai 👋', `I’ll help you learn **${language}** words. What’s your name?`];
export const afterNameLines = (name: string) => [`Nice to meet you, **${name}**! 😊`, 'Which language should we chat in?'];
export const explainLines = [
  'Here’s what I do ✨',
  '🃏 I make **decks** of words just for you',
  '👆 **Review** them with quick swipes',
  '💬 Use them in sentences with me',
  '🔒 Hard words go to your **lock screen**',
  'Let’s start with **10 new words**. What do you want to learn? 🌮',
];
export const LINES = {
  goodChoice: 'Good choice! Here’s your first deck 👇',
  tapGenerate: 'Tap Generate and I will make it for you ✨',
  proposeFailed: 'I could not reach the server. Tap to try again.',
  picking: 'Picking the best words for your level… ⏳',
  generateFailed: 'That did not work. Tap Generate to try again.',
  ready: 'Your deck is **ready**! 🎉 Tap it any time to see the words.',
  practice: 'Shall we practice them now? 💪',
} as const;
// After Kai answers something off the script, it asks the step's question again.
export const BACK: Record<Step, string> = {
  name: 'So, what’s your name? 😊',
  language: 'Which language should we chat in?',
  topic: 'So, what do you want to learn? 🌮',
  proposed: 'Tap **Generate** when you’re ready ✨',
  generating: 'Your words are almost ready ⏳',
  ready: 'Shall we practice them now? 💪',
};

// Kai's state follows the chat (kai-chat-live). One place decides it, in this order.
export const QUIET_MS = 20_000;
export type ChatMoment = {
  step: Step;
  opened: boolean; // the chat just opened, nothing typed yet
  typing: boolean; // a dots bubble shows
  waiting: boolean; // the app waits for the server
  composerText: boolean; // the user is typing
  quiet: boolean; // the user's turn, nothing happened for QUIET_MS
  failed: boolean; // a server call just failed
};
export function kaiStateFor(m: ChatMoment): KaiState {
  if (m.failed) return 'oops';
  if (m.step === 'generating') return 'making';
  if (m.waiting) return 'thinking';
  if (m.typing) return 'speaking';
  if (m.composerText) return 'listening';
  if (m.quiet) return 'waiting';
  if (m.step === 'ready') return 'celebrate';
  if (m.opened) return 'greeting';
  return 'idle';
}

export const REPLIES = { practice: 'OK, let’s practice!', wordsFirst: 'Show me the words first', tryAgain: 'Try again' } as const;

// Each language under its own name, as in Figma ("English", "Español").
const OWN_NAME: Record<string, string> = { en: 'English', es: 'Español', fa: 'فارسی', ar: 'العربية', ja: '日本語', ko: '한국어' };
const ownName = (l: LanguageChoice) => (l.code && OWN_NAME[l.code]) || l.name;

export const chatLanguageOptions = (speaks: LanguageChoice, learning: LanguageChoice): { label: string; value: ProfileChat['chatLanguage'] }[] => [
  { label: ownName(speaks), value: 'native' },
  { label: ownName(learning), value: 'target' },
];
