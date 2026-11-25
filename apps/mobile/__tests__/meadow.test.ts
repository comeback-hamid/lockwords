import { goalMeadow, KAI_CELLS, nowMeadow, type Scene } from '@/progress/meadow';
import { colors, levelColors } from '@/theme/theme';

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
    expect(leaves(m).map((b) => b.color).slice(0, 3)).toEqual([levelColors[5], levelColors[2], levelColors[1]]);
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

describe('the big meadow (the goal)', () => {
  test('a goal of 100: three full trees of three kinds, in the strong greens', () => {
    const m = goalMeadow(100);
    expect(m.trees).toBe(3);
    expect(leaves(m)).toHaveLength(90);
    expect(new Set(leaves(m).map((b) => b.tree)).size).toBe(3);
    expect(leaves(m).every((b) => ([levelColors[3], levelColors[4], levelColors[5]] as string[]).includes(b.color))).toBe(true);
    inside(m);
  });

  test('never fewer than three trees; a bigger goal has more', () => {
    expect(goalMeadow(0).trees).toBe(3);
    expect(goalMeadow(300).trees).toBe(9);
    inside(goalMeadow(300));
  });

  test('its trees are bigger on the screen than the small meadow’s', () => {
    // Both pictures fill the same width, so fewer cells across = bigger blocks.
    expect(goalMeadow(100).width).toBeLessThan(nowMeadow([levels(30)], [30]).width);
  });

  test('the same goal always gives the same picture', () => {
    expect(goalMeadow(100)).toEqual(goalMeadow(100));
  });
});

test('every tree block knows its tree, its height above the ground and its place in the growth order (for the animation)', () => {
  const m = goalMeadow(100);
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
