import { LANGUAGES } from '@/onboarding/languages';

// Small rules of the New words chat that are not screen code.

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
export const TOO_MANY = 'We talked a lot today! 😊 Come back tomorrow and we’ll go on.';
