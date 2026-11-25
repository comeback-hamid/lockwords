import { card } from '@/theme/theme';

// How wide one letter is, as a part of the font size (Mona Sans SemiBold, with room to spare: a wide word like
// "presentation" must still fit). The text also shrinks itself if a line is a little too long after all.
const LETTER = 0.56;
const BIGGEST = card.wordSizes[0];
const SMALLEST = 14;
// A phrase stays on one line down to this size; under it, it goes on two lines with a bigger font.
const ONE_LINE_MIN = 24;

const sizeFor = (letters: number, width: number) => Math.max(SMALLEST, Math.min(BIGGEST, Math.floor(width / (Math.max(1, letters) * LETTER))));

// The best cut of a phrase into two lines: the one where the longer line is shortest. Words are never cut.
function twoLines(words: string[]): [string, string] {
  let best: [string, string] = [words.join(' '), ''];
  for (let i = 1; i < words.length; i++) {
    const cut: [string, string] = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    if (Math.max(cut[0].length, cut[1].length) < Math.max(best[0].length, best[1].length)) best = cut;
  }
  return best;
}

// How the word is set on the card (Hamid, 2026-11-25): one or two lines, never three; a word is never cut in the
// middle; the font gets smaller instead. The lines are fixed here, so the phone cannot break them another way.
export function wordLayout(word: string, width: number = card.wordMaxWidth): { size: number; lines: string[] } {
  const text = word.trim().replace(/\s+/g, ' ');
  const words = text.split(' ');
  const one = sizeFor(text.length, width);
  if (words.length === 1 || one >= ONE_LINE_MIN) return { size: one, lines: [text] };
  const lines = twoLines(words);
  return { size: sizeFor(Math.max(lines[0].length, lines[1].length), width), lines };
}
