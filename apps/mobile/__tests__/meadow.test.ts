import { futureMeadow, KAI_CELLS, nowMeadow, type Scene } from '@/progress/meadow';
import { colors, levelColors, levelNew } from '@/theme/theme';

const leaves = (m: Scene) => m.blocks.filter((b) => b.kind === 'leaf');
const stems = (m: Scene) => m.blocks.filter((b) => b.kind === 'trunk');
const levels = (n: number, level = 3) => Array.from({ length: n }, () => level);
const inside = (m: Scene) => {
  for (const b of m.blocks) {
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.size).toBeLessThanOrEqual(m.width + 0.001);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.size).toBeLessThanOrEqual(m.height + 0.001);
  }
};

describe('the small meadow (now)', () => {
  test('no decks: the ground and one small tree, a bare stem', () => {
    const m = nowMeadow([], []);
    expect(leaves(m)).toHaveLength(0);
    expect(stems(m).length).toBeGreaterThan(0);
    expect(m.trees).toBe(1);
    expect(m.blocks.some((b) => b.kind === 'ground')).toBe(true);
  });

  test('one leaf per word of the deck: met words in the green of their level, words not met yet in the lightest green', () => {
    const m = nowMeadow([[5, 2]], [10]);
    expect(leaves(m)).toHaveLength(10);
    expect(leaves(m).map((b) => b.color).slice(0, 3)).toEqual([levelColors[5], levelColors[2], levelNew]); // a new word has its own lightest green since 2026-11-25
    expect(stems(m).every((b) => b.color === colors.subtle || b.color === colors.lineStrong)).toBe(true);
  });

  test('a tree holds 30 leaves at most; a deck of 1 to 3 words is a sprout', () => {
    expect(leaves(nowMeadow([levels(45)], [45]))).toHaveLength(30);
    expect(leaves(nowMeadow([[]], [2]))).toHaveLength(2);
    expect(stems(nowMeadow([[]], [2]))).toHaveLength(2);
  });

  test('one tree per deck; every block is inside the picture and none stands where Kai stands', () => {
    const m = nowMeadow([levels(30), levels(12), [], levels(2)], [30, 12, 10, 2]);
    expect(m.trees).toBe(4);
    expect(leaves(m)).toHaveLength(30 + 12 + 10 + 2);
    inside(m);
    for (const b of m.blocks.filter((b) => b.kind === 'leaf' || b.kind === 'trunk')) expect(b.x + b.size).toBeLessThanOrEqual(m.width - KAI_CELLS);
  });

  test('many decks make rows: the rows behind are smaller and paler', () => {
    const m = nowMeadow(Array.from({ length: 14 }, () => levels(30)), Array.from({ length: 14 }, () => 30));
    const sizes = [...new Set(leaves(m).map((b) => Number(b.size.toFixed(3))))].sort((a, b) => b - a);
    expect(sizes.length).toBeGreaterThan(1);
    const back = leaves(m).filter((b) => Number(b.size.toFixed(3)) === sizes.at(-1));
    expect(back.every((b) => b.opacity < 1)).toBe(true);
    expect(leaves(m)).toHaveLength(14 * 30);
    inside(m);
  });
});

describe('the meadow in 3 months (it replaced the big goal meadow on 2026-11-25)', () => {
  test('100 words: three full trees of three kinds, in the strong greens', () => {
    const m = futureMeadow(100);
    expect(m.trees).toBe(3);
    expect(leaves(m)).toHaveLength(90);
    expect(new Set(leaves(m).map((b) => b.tree)).size).toBe(3);
    expect(leaves(m).every((b) => ([levelColors[3], levelColors[4], levelColors[5]] as string[]).includes(b.color))).toBe(true);
    inside(m);
  });

  test('never fewer than three trees; more words have more', () => {
    expect(futureMeadow(0).trees).toBe(3);
    expect(futureMeadow(300).trees).toBe(9);
    inside(futureMeadow(300));
  });

  test('it is the same place as today’s meadow: the same width, with room for Kai on the right', () => {
    const then = futureMeadow(320);
    expect(then.width).toBe(nowMeadow([levels(30)], [30]).width);
    expect(then.trees).toBe(10);
    const trunks = then.blocks.filter((b) => b.kind === 'trunk' && b.opacity === 1); // the front row
    expect(Math.max(...trunks.map((b) => b.x))).toBeLessThan(then.width - KAI_CELLS);
  });

  test('the same number of words always gives the same picture', () => {
    expect(futureMeadow(100)).toEqual(futureMeadow(100));
  });
});

test('every tree block knows its tree, its height above the ground and its place in the growth order (for the animation)', () => {
  const m = futureMeadow(100);
  for (const b of m.blocks.filter((b) => b.kind === 'leaf' || b.kind === 'trunk')) {
    expect(b.tree).toBeGreaterThanOrEqual(0);
    expect(b.lift).toBeGreaterThan(0);
    expect(b.lift).toBeLessThanOrEqual(b.reach);
    expect(b.order).toBeGreaterThanOrEqual(0);
  }
  for (const b of m.blocks.filter((b) => b.kind === 'ground')) expect(b.tree).toBe(-1);
  // A trunk grows before its leaves.
  const tree0 = m.blocks.filter((b) => b.tree === 0);
  expect(Math.max(...tree0.filter((b) => b.kind === 'trunk').map((b) => b.order))).toBeLessThan(Math.min(...tree0.filter((b) => b.kind === 'leaf').map((b) => b.order)));
});
