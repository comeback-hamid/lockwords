import type { ChatDeck, KaiMessage } from '@/api/client';
import type { KaiState } from '@/kai/states';
import { kaiStateFor, QUIET_MS } from '@/onboarding/kai-script';
import { LANGUAGES } from '@/onboarding/languages';

// Small rules of the New words chat that are not screen code.

// A line of the chat. A Kai line may have a word card or deck cards under it.
// tapped: the learner tapped a reply option, so the bubble rises into the chat.
export type Line = Pick<KaiMessage, 'id' | 'from' | 'text' | 'translation' | 'word' | 'decks'> & { tapped?: boolean };

// A new line joins the chat. When it brings deck ideas, the older ideas are not current any more.
export function withLine(all: Line[], next: Line): Line[] {
  if (!next.decks?.length) return [...all, next];
  return [...all.map((l) => (l.decks ? { ...l, decks: l.decks.map((d) => ({ ...d, current: false })) } : l)), next];
}
export const withDeckStatus = (all: Line[], deckId: string, status: ChatDeck['status']): Line[] =>
  all.map((l) => (l.decks?.some((d) => d.id === deckId) ? { ...l, decks: l.decks.map((d) => (d.id === deckId ? { ...d, status } : d)) } : l));

// After a restart or a visit to another tab: a current deck that is still being made, or is made and Kai has not said so here yet.
export function pendingDeck(all: Line[], told: ReadonlySet<string>): ChatDeck | null {
  for (const l of [...all].reverse()) for (const d of l.decks ?? []) if (d.current && (d.status === 'generating' || (d.status === 'ready' && !told.has(d.id)))) return d;
  return null;
}

// The label on the translation button: "EN" for English. The profile keeps a code for a listed language and the typed name for any other.
export function languageCode(saved: string | null): string {
  if (!saved) return '';
  const s = saved.trim().toLowerCase();
  const listed = LANGUAGES.find((l) => l.code === s || l.name.toLowerCase() === s);
  return (listed?.code ?? s.slice(0, 2)).toUpperCase();
}

// How long Kai's typing dots show before a line: 0.8 s for a short line, up to 1.2 s for a long one.
// This screen keeps its own line queue and this rule. The shared `useKaiTyping` types a little slower (8 ms a letter) and is
// switched off in Jest, and this screen's tests (which we do not edit) check the times of this rule. See new-words-polish, tasks.md.
export const typingMs = (line: string) => Math.round(Math.min(1200, Math.max(800, 800 + (line.length - 20) * 4)));

export const REVIEW_DELAY_MS = 1000; // Kai says "I take you to Review", then the tab opens
export const MAKE_FAILED = 'That did not work. 😕 Please try again.'; // making a deck failed; the cards are back
export const TOO_MANY = 'We talked a lot today! 😊 Come back tomorrow and we’ll go on.';

// Kai's header state on this screen: the shared rules of the onboarding chat (`kaiStateFor`), plus sleeping after a long quiet.
export { QUIET_MS };
export const SLEEP_MS = 120_000; // the learner's turn and nothing happened for 2 minutes
export const OOPS_MS = 1200; // how long `oops` holds after a failure, as in the onboarding chat
export type NewWordsMoment = {
  failed: boolean; // a turn or making a deck just failed
  making: boolean; // a deck is being made
  waiting: boolean; // the app waits for the server
  typing: boolean; // a typing bubble shows before one of Kai's lines
  composerText: boolean; // the learner is typing
  rest: 'waiting' | 'sleeping' | null; // the learner's turn and nothing happened for QUIET_MS, then SLEEP_MS
  celebrate: boolean; // a deck is ready or a word was added
  greeting: boolean; // Kai opened the chat
};
export function newWordsKaiState(m: NewWordsMoment): KaiState {
  const state = kaiStateFor({ step: m.making ? 'generating' : m.celebrate ? 'ready' : 'topic', opened: m.greeting, typing: m.typing, waiting: m.waiting, composerText: m.composerText, quiet: m.rest !== null, failed: m.failed });
  return state === 'waiting' && m.rest === 'sleeping' ? 'sleeping' : state;
}

// Older messages: asked for when the learner has scrolled this close to the top of the chat.
export const TOP_PX = 40;
// The page before joins above the lines on screen. A line that is already there is not added twice.
export function withOlder(all: Line[], older: Line[]): Line[] {
  const have = new Set(all.map((l) => l.id));
  return [...older.filter((l) => !have.has(l.id)), ...all];
}
