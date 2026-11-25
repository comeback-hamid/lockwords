import { nowMeadow } from '@/progress/meadow';
import { meadowData, MOTION, paintMeadow, type Painter } from '@/progress/meadow-motion';

// The meadow's motion for the browser (web-live-kai): the same numbers as the phone's canvas. Trees grow in block by
// block, then move in the wind; leaves fall only once everything has grown; Reduce Motion gives a still picture.
const scene = nowMeadow([[3, 3, 3, 2, 2, 1, 1, 1, 0, 0, 0, 0]], [12]);
function recorder() {
  const blocks: { x: number; y: number; s: number; a: number }[] = [];
  let rotations = 0;
  const p: Painter = { block: (x, y, s, _r, _g, _b, a) => void blocks.push({ x, y, s, a }), save: () => {}, restore: () => {}, rotate: () => void rotations++ };
  return { p, blocks, rotations: () => rotations };
}
const treeBlocks = scene.blocks.filter((b) => b.tree >= 0).length;
const groundBlocks = scene.blocks.length - treeBlocks;

test('still: every block is drawn once, in its own place and size', () => {
  const d = meadowData(scene, false);
  const r = recorder();
  paintMeadow(r.p, d, 0, true);
  expect(r.blocks).toHaveLength(scene.blocks.length);
  scene.blocks.forEach((b, i) => {
    expect(r.blocks[i]!.x).toBeCloseTo(b.x, 5);
    expect(r.blocks[i]!.y).toBeCloseTo(b.y, 5);
    expect(r.blocks[i]!.s).toBeCloseTo(b.size, 5);
  });
});

test('at the start only the ground and grass show; the trees have not grown yet', () => {
  const d = meadowData(scene, false);
  const r = recorder();
  paintMeadow(r.p, d, 0, false);
  expect(r.blocks).toHaveLength(groundBlocks);
});

test('the trees grow in block by block: more blocks after a moment, all of them once grown', () => {
  const d = meadowData(scene, false);
  const early = recorder(), late = recorder();
  paintMeadow(early.p, d, MOTION.growStepMs * 3, false);
  paintMeadow(late.p, d, d.grown + 1, false);
  expect(early.blocks.length).toBeGreaterThan(groundBlocks);
  expect(early.blocks.length).toBeLessThan(scene.blocks.length);
  expect(late.blocks.length).toBeGreaterThanOrEqual(scene.blocks.length);
});

test('a block pops in: it is smaller than itself half way through its growth', () => {
  const d = meadowData(scene, false);
  const first = d.items.findIndex((i) => i.delay === 0 && i.k >= 2);
  const r = recorder();
  paintMeadow(r.p, d, MOTION.growMs * 0.3, false);
  const drawn = r.blocks[first]!;
  expect(drawn.s).toBeGreaterThan(0);
  expect(drawn.s).toBeLessThan(d.items[first]!.s);
});

test('the wind bends the top of a tree more than its foot', () => {
  const d = meadowData(scene, false);
  const inTree = d.items.filter((i) => i.k >= 2);
  const foot = inTree.reduce((a, b) => (b.bend < a.bend ? b : a));
  const top = inTree.reduce((a, b) => (b.bend > a.bend ? b : a));
  expect(top.bend).toBeGreaterThan(0.5);
  expect(foot.bend).toBeLessThan(top.bend / 5);
  // The ground and the grass are not part of a tree: the wind does not bend them this way.
  expect(d.items.filter((i) => i.k < 2).every((i) => i.bend === 0)).toBe(true);
});

test('two moments are two pictures once grown; falling leaves come only after the growth and only with motion', () => {
  const d = meadowData(scene, true);
  const a = recorder(), b = recorder(), growing = recorder(), still = recorder();
  paintMeadow(a.p, d, d.grown + 1000, false);
  paintMeadow(b.p, d, d.grown + 2000, false);
  expect(a.blocks.map((x) => x.x.toFixed(3)).join()).not.toBe(b.blocks.map((x) => x.x.toFixed(3)).join());
  paintMeadow(growing.p, d, d.grown - 1, false);
  paintMeadow(still.p, d, d.grown + 1000, true);
  expect(growing.rotations()).toBe(0);
  expect(still.rotations()).toBe(0);
  expect(still.blocks).toHaveLength(scene.blocks.length);
});
