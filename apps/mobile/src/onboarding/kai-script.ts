import type { ProfileChat } from '@/api/client';
import type { KaiState } from '@/kai/states';

import type { LanguageChoice } from './store';

// Kai's lines for the onboarding chat (O10–O10f). **word** = bold.
// The English lines below are the built-in copy. Other languages come from the server (`GET /v1/kai/script`,
// same keys as apps/server/src/kai/script.ts) and are read through `makeScript`.
// drawing: the first deck's words are made and its pictures are being drawn; the learner can chat with Kai meanwhile.
export type Step = 'name' | 'language' | 'topic' | 'proposed' | 'generating' | 'drawing' | 'ready';
export type KaiPose = KaiState;

const POSE: Record<Step, KaiPose> = { name: 'greeting', language: 'idle', topic: 'idle', proposed: 'listening', generating: 'thinking', drawing: 'thinking', ready: 'celebrate' };
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
  wordsReady: 'Your words are **ready**! 🎉 Now I’m drawing a **picture** for each one 🎨',
  whileDrawing: 'It takes about half a minute. Meanwhile, ask me a **question**, send a sentence to correct, or ask about me 🙂',
  picturesProgress: '**{ready}** of **{total}** pictures are ready 🎨',
  picturesReady: 'All the pictures are **ready**! 🖼️ Tap your deck any time to see the words.',
  picturesFailed: 'I could not draw the pictures this time, but your deck is **ready**! Tap it any time to see the words.',
  practice: 'Shall we practice them now? 💪',
} as const;
// After Kai answers something off the script, it asks the step's question again.
export const BACK: Record<Step, string> = {
  name: 'So, what’s your name? 😊',
  language: 'Which language should we chat in?',
  topic: 'So, what do you want to learn? 🌮',
  proposed: 'Tap **Generate** when you’re ready ✨',
  generating: 'Your words are almost ready ⏳',
  drawing: 'Your pictures are almost ready 🎨',
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
  if (m.step === 'drawing') return 'making'; // Kai draws, unless it is busy with the learner (the lines above)
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

// --- Kai's lines by key, in the learner's language ---

// How long the chat waits for the script in another language before it starts in English.
export const SCRIPT_WAIT_MS = 8000; // the first translation of a language can take this long on the server

const [hi, askName] = openingLines('{language}') as [string, string];
const [niceToMeet, whichLanguage] = afterNameLines('{name}') as [string, string];
// The same keys as the server's script (apps/server/src/kai/script.ts). A server test keeps the two in step.
export const ENGLISH_SCRIPT: Record<string, string> = {
  hi,
  askName,
  niceToMeet,
  whichLanguage,
  ...Object.fromEntries(explainLines.map((line, i) => [`explain${i + 1}`, line])),
  ...LINES,
  backName: BACK.name,
  backTopic: BACK.topic,
  backProposed: BACK.proposed,
  backGenerating: BACK.generating,
  backDrawing: BACK.drawing,
  replyPractice: REPLIES.practice,
  replyWordsFirst: REPLIES.wordsFirst,
  replyTryAgain: REPLIES.tryAgain,
};
export const EXPLAIN_KEYS = explainLines.map((_, i) => `explain${i + 1}`);
// The line Kai says again after an off-script answer, per step.
export const BACK_KEY: Record<Step, string> = { name: 'backName', language: 'whichLanguage', topic: 'backTopic', proposed: 'backProposed', generating: 'backGenerating', drawing: 'backDrawing', ready: 'practice' };

export type ScriptMaps = { native: Record<string, string>; learning: Record<string, string> };
export type ScriptLine = { text: string; translation?: string };
export type Script = { line(key: string, vars?: Record<string, string>): ScriptLine; label(key: string): string };

export const isEnglish = (l: LanguageChoice | null) => l?.code === 'en' || l?.name.trim().toLowerCase() === 'english';

// Kai's lines for this chat. No loaded script = English. Until a chat language is picked, and after "native": the
// learner's own language. After "target": the learned language, with the own-language line under it as a translation.
export function makeScript(maps: ScriptMaps | null, chat: ProfileChat['chatLanguage'] | null): Script {
  const main = !maps ? ENGLISH_SCRIPT : chat === 'target' ? maps.learning : maps.native;
  const under = maps && chat === 'target' ? maps.native : null;
  // A key the map does not have falls back to English; an unknown deck idea stays as the server sent it.
  const raw = (map: Record<string, string>, key: string) => map[key] ?? ENGLISH_SCRIPT[key] ?? key.replace(/^idea:/, '');
  const fill = (text: string, vars?: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_all, name: string) => vars?.[name] ?? '');
  return {
    line(key, vars) {
      const text = fill(raw(main, key), vars);
      const translation = under ? fill(raw(under, key), vars) : undefined;
      return translation && translation !== text ? { text, translation } : { text };
    },
    label: (key) => raw(main, key),
  };
}
