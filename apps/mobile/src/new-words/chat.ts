import type { ChatDeck, KaiMessage } from '@/api/client';
import { LANGUAGES } from '@/onboarding/languages';

// Small rules of the New words chat that are not screen code.

// A line of the chat. A Kai line may have a word card or deck cards under it.
export type Line = Pick<KaiMessage, 'id' | 'from' | 'text' | 'translation' | 'word' | 'decks'>;

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
// shortcut: the same rule as `kai-chat-live` (PR #20). When that change is merged, use its `useKaiTyping` and delete this.
export const typingMs = (line: string) => Math.round(Math.min(1200, Math.max(800, 800 + (line.length - 20) * 4)));

export const REVIEW_DELAY_MS = 1000; // Kai says "I take you to Review", then the tab opens
export const MAKE_FAILED = 'That did not work. 😕 Please try again.'; // making a deck failed; the cards are back
export const TOO_MANY = 'We talked a lot today! 😊 Come back tomorrow and we’ll go on.';
