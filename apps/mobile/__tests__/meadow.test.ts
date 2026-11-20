import { meadowBlocks, SPEC } from '@/progress/meadow';
import { colors, levelColors } from '@/theme/theme';

const leaves = (m: ReturnType<typeof meadowBlocks>) => m.blocks.filter((b) => b.kind === 'leaf');
const stems = (m: ReturnType<typeof meadowBlocks>) => m.blocks.filter((b) => b.kind === 'trunk');
const levels = (n: number, level = 3) => Array.from({ length: n }, () => level);

test('no decks: only the ground', () => {
  const m = meadowBlocks([]);
  expect(m.blocks.length).toBeGreaterThan(0);
  expect(m.blocks.every((b) => b.kind === 'ground' || b.kind === 'grass')).toBe(true);
});

test('a deck with no met word is a bare stem; 1 to 3 words are a sprout with one leaf per word', () => {
  expect(leaves(meadowBlocks([[]]))).toHaveLength(0);
  expect(stems(meadowBlocks([[]]))).toHaveLength(1);
  expect(leaves(meadowBlocks([[2, 1]]))).toHaveLength(2);
  expect(stems(meadowBlocks([[2, 1]]))).toHaveLength(2);
});

test('a tree has one leaf block per met word, in the color of its level, 30 at most', () => {
  const m = meadowBlocks([[5, 5, 4, 3, 2, 1, 1, 1]]);
  expect(leaves(m)).toHaveLength(8);
  expect(leaves(m).map((b) => b.color).slice(0, 3)).toEqual([levelColors[5], levelColors[5], levelColors[4]]);
  expect(stems(m).every((b) => b.color === colors.subtle || b.color === colors.lineStrong)).toBe(true);
  expect(leaves(meadowBlocks([levels(45)]))).toHaveLength(SPEC.wordsPerDeck);
});

test('one tree per deck; every block is inside the picture', () => {
  const m = meadowBlocks([levels(30), levels(12), [], levels(2)]);
  expect(leaves(m)).toHaveLength(30 + 12 + 0 + 2);
  for (const b of m.blocks) {
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.size).toBeLessThanOrEqual(m.width + 0.001);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.size).toBeLessThanOrEqual(m.height + 0.001);
  }
});

test('many decks make rows: the rows behind are smaller and paler', () => {
  const m = meadowBlocks(Array.from({ length: 14 }, () => levels(30)));
  const sizes = [...new Set(leaves(m).map((b) => Number(b.size.toFixed(3))))].sort((a, b) => b - a);
  expect(sizes.length).toBeGreaterThan(1);
  const back = leaves(m).filter((b) => Number(b.size.toFixed(3)) === sizes.at(-1));
  expect(back.every((b) => b.opacity < 1)).toBe(true);
  expect(leaves(m)).toHaveLength(14 * 30);
});
