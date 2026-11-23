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
