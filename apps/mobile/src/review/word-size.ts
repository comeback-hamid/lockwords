import { card } from '@/theme/theme';

// Letters that fit on one line of the card at each size (Mona Sans SemiBold, 219 wide). Figma: Flashcard · rules.
const LETTERS_PER_LINE: Record<number, number> = { 44: 10, 36: 12, 30: 15, 24: 18 };
const LINES = 2;

// Lines the text takes when a line holds `perLine` letters and words are not cut.
function linesAt(words: string[], perLine: number): number {
  let lines = 1;
  let used = 0;
  for (const word of words) {
    const next = used === 0 ? word.length : used + 1 + word.length;
    if (next <= perLine) used = next;
    else {
      lines += 1;
      used = word.length;
    }
  }
  return lines;
}

// The font size of the word on the card: the biggest size where it fits on two lines with no word cut.
// A very long phrase gets the smallest size (three lines; the text shrinks itself if even that is too small).
export function wordSize(word: string): number {
  const words = word.trim().split(/\s+/);
  const longest = Math.max(...words.map((w) => w.length));
  const smallest = card.wordSizes[card.wordSizes.length - 1]!;
  return card.wordSizes.find((size) => longest <= LETTERS_PER_LINE[size]! && linesAt(words, LETTERS_PER_LINE[size]!) <= LINES) ?? smallest;
}

// One line holds the whole phrase down to this size; under it the phrase goes on two lines at a bigger size.
const ONE_LINE_SIZES = [44, 36, 30];

// How the word is set on the card (Hamid, 2026-11-24): one line when it fits at a readable size, with a smaller font
// before a second line. A single word is never cut: it stays on one line and the text shrinks itself to fit.
export function wordFit(word: string): { size: number; lines: number } {
  const text = word.trim();
  const words = text.split(/\s+/);
  const oneLine = ONE_LINE_SIZES.find((size) => text.length <= LETTERS_PER_LINE[size]!);
  if (oneLine) return { size: oneLine, lines: 1 };
  const size = wordSize(text);
  if (words.length === 1) return { size, lines: 1 };
  return { size, lines: card.wordLines }; // room for one more line than counted: the letter counts are estimates
}
