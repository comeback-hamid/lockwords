import type { TextStyle } from 'react-native';

// Each text of a chat is aligned by its own script, not by the app's language:
// a Persian line is right-aligned and its English translation under it left-aligned, and the other way round.

// Letters of right-to-left scripts (Hebrew, Arabic with Persian and Urdu, and their presentation forms)…
const RTL_LETTERS = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/g;
// …and of the left-to-right scripts that get mixed into them (Latin, Greek, Cyrillic).
const LTR_LETTERS = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/g;

// Right-to-left when most of the letters are. One English word in a Persian line does not turn it around.
export function isRtl(text: string): boolean {
  const count = (letters: RegExp) => text.match(letters)?.length ?? 0;
  return count(RTL_LETTERS) > count(LTR_LETTERS);
}

const RTL: TextStyle = { textAlign: 'right', writingDirection: 'rtl' };
const LTR: TextStyle = { textAlign: 'left', writingDirection: 'ltr' };
export const directionStyle = (text: string): TextStyle => (isRtl(text) ? RTL : LTR);
