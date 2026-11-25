import { colors, levelColors } from '@/theme/theme';

// The pixel meadows of the Progress tab (Figma P1). Two pictures, one layout:
//   nowMeadow  = the small one at the top: one tree per deck, one leaf per word, Kai stands on its right.
//   goalMeadow = the big one: the forest the learner will have at the goal, at least three full trees.
// Tree shapes come from `drawForest` in docs/design/pixel-meadow.html (its SPEC and FOREST).
// Pure: numbers in, a list of blocks out. src/components/meadow-canvas.tsx draws and moves them.
export const SPEC = {
  cell: { gap: 0.12, radius: 0.22 }, // each block is (1 - gap) wide, with rounded corners, like a level square
  wordsPerDeck: 30,
  // canopy rows from top to bottom: number of blocks in each row, centered. Each sums to 30.
  trees: {
    oak: { rows: [4, 6, 8, 8, 4], trunkW: 2, trunkMax: 3, lightTrunk: false },
    pine: { rows: [1, 3, 5, 5, 7, 9], trunkW: 1, trunkMax: 2, lightTrunk: false },
    birch: { rows: [2, 4, 6, 6, 6, 4, 2], trunkW: 2, trunkMax: 4, lightTrunk: true },
  },
  order: ['oak', 'pine', 'birch', 'oak', 'pine', 'oak', 'birch', 'pine', 'oak', 'pine'],
  grassEvery: 6,
} as const;
// Many trees: several rows with depth. Each row back is smaller, sits higher and is a little paler.
const FOREST = { shrink: 0.66, rise: 9.5, fade: 0.08, minOpacity: 0.55, tallest: 12.5 } as const;

// Cells kept free on the right of the small meadow: Kai stands there.
export const KAI_CELLS = 11;
// How each picture is laid out. `cells` = blocks across the full width, so fewer cells = bigger blocks.
// The numbers follow the Figma frames (393 wide): 44 cells = 8.9 pt blocks, 36 cells = 10.9 pt blocks.
const NOW = { cells: 44, slot: 9, margin: 4, reserve: KAI_CELLS } as const;
const GOAL = { cells: 36, slot: 11, margin: 3, reserve: 0 } as const;
const GOAL_WORDS_PER_TREE = 33; // a goal of 100 words = 3 trees
const GOAL_MIN_TREES = 3;
const NEW_LEAF = levelColors[1]; // a word that is in the deck but not met yet: the lightest green, as in the goal grid

type TreeKind = keyof typeof SPEC.trees;
type Layout = { cells: number; slot: number; margin: number; reserve: number };
export type Block = {
  kind: 'ground' | 'grass' | 'trunk' | 'leaf';
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  tree: number; // which tree the block belongs to; -1 for the ground and the grass
  lift: number; // how high above the ground the block sits, in picture cells (the wind bends the top more)
  reach: number; // the height of its tree, in picture cells
  order: number; // the block's place in the growth order of its tree: the trunk first, then leaves from the bottom center
};
export type Scene = { width: number; height: number; groundY: number; trees: number; blocks: Block[] };
type Cell = { kind: Block['kind']; x: number; y: number; color: string; order: number }; // in one row's own cells; y 0 = the ground row, up is negative

// The spec's small random source, so a picture is the same on every phone.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Cells of a full canopy in growth order: bottom center first, then up and out.
function canopyCells(kind: TreeKind) {
  const rows = SPEC.trees[kind].rows;
  const cells: { x: number; row: number }[] = [];
  rows.forEach((n, ri) => {
    for (let i = 0; i < n; i++) cells.push({ x: i - (n - 1) / 2, row: rows.length - 1 - ri }); // row 0 = bottom row
  });
  return cells.sort((a, b) => a.row * 1.35 + Math.abs(a.x) * 0.9 - (b.row * 1.35 + Math.abs(b.x) * 0.9));
}

// A level under zero is a ghost: a word of a tree that is still to grow, drawn in grey.
export const GHOST = -1;
const leafColor = (level: number) => (level < 0 ? colors.line : level > 0 ? (levelColors[level] ?? NEW_LEAF) : NEW_LEAF);

// One tree standing on the ground at column cx. `levels` = one level per word of the deck (0 = not met yet).
function treeCells(cx: number, kind: TreeKind, allLevels: number[]): Cell[] {
  const levels = allLevels.slice(0, SPEC.wordsPerDeck);
  const n = levels.length;
  const out: Cell[] = [];
  if (n < 4) {
    // A sprout: a stem and up to 3 leaf blocks. No words yet is the bare stem.
    const stemH = n >= 2 ? 2 : 1;
    for (let h = 0; h < stemH; h++) out.push({ kind: 'trunk', x: cx, y: -1 - h, color: colors.subtle, order: h });
    const spots = [[-1, 0], [1, 0], [2, -1]] as const;
    for (let i = 0; i < n; i++) out.push({ kind: 'leaf', x: cx + spots[i]![0], y: -1 - stemH + spots[i]![1], color: leafColor(levels[i]!), order: stemH + i });
    return out;
  }
  const t = SPEC.trees[kind];
  const mid = t.rows[0] % 2 === 1 ? cx + 0.5 : cx; // keep every block on the whole-cell grid
  const trunkH = Math.max(1, Math.min(t.trunkMax, Math.ceil(n / 8)));
  for (let h = 0; h < trunkH; h++) {
    for (let w = 0; w < t.trunkW; w++) out.push({ kind: 'trunk', x: mid - t.trunkW / 2 + w, y: -1 - h, color: levels[0]! < 0 ? colors.line : t.lightTrunk && h % 2 === 1 ? colors.lineStrong : colors.subtle, order: h });
  }
  const cells = canopyCells(kind);
  for (let i = 0; i < n; i++) out.push({ kind: 'leaf', x: mid + cells[i]!.x - 0.5, y: -1 - trunkH - cells[i]!.row, color: leafColor(levels[i]!), order: trunkH + i });
  return out;
}

// The n-th tree of a row: the first in the center, then right, left, right, left ...
const side = (i: number) => (i === 0 ? 0 : i % 2 === 1 ? (i + 1) / 2 : -(i / 2));

// `trees`: one list of levels per tree, oldest first. Returns the picture's size in cells and every block in it.
function layOut(trees: number[][], layout: Layout): Scene {
  const W = layout.cells;
  const room = W - layout.reserve; // the trees stand in this part, from the left edge
  // Rows from front to back, enough to hold every tree. The front row has the newest trees at full size.
  const rows: { scale: number; cap: number; off: number; trees: number[][]; first: number }[] = [];
  let left = Math.max(1, trees.length);
  for (let k = 0; left > 0 && k < 9; k++) {
    const scale = Math.pow(FOREST.shrink, k);
    const cap = Math.max(1, Math.floor((room - layout.margin) / (layout.slot * scale)));
    rows.push({ scale, cap, off: 0, trees: [], first: 0 });
    left -= cap;
  }
  let rise = 0;
  for (const r of rows) {
    r.off = rise;
    rise += FOREST.rise * r.scale;
  }
  let end = trees.length;
  for (const r of rows) {
    r.first = Math.max(0, end - r.cap);
    r.trees = trees.slice(r.first, end);
    end -= r.cap;
  }
  const top = rows.at(-1)!;
  const height = Math.ceil(top.off + FOREST.tallest * top.scale + 3);
  const groundY = height - 2;
  const random = rng(7);
  const blocks: Block[] = [];
  const gap = SPEC.cell.gap;
  // Back rows first, so the front row is drawn over them.
  for (let k = rows.length - 1; k >= 0; k--) {
    const r = rows[k]!;
    const opacity = Math.max(FOREST.minOpacity, 1 - k * FOREST.fade);
    const size = (1 - gap) * r.scale;
    const put = (c: Cell, centerX: number, tree: number, reach: number) => {
      const x = centerX + (c.x + gap / 2) * r.scale;
      if (x < 0 || x + size > W) return; // the ground of a small row runs past the edge
      blocks.push({ kind: c.kind, x, y: groundY - r.off + (c.y + gap / 2) * r.scale, size, color: c.color, opacity, tree, lift: -c.y * r.scale, reach, order: c.order });
    };
    const half = Math.ceil(W / 2 / r.scale);
    for (let x = -half; x < half; x++) put({ kind: 'ground', x, y: 0, color: colors.line, order: 0 }, W / 2, -1, 0);
    if (k === 0) {
      for (let x = -half + 2; x < half - 1; x++) {
        const v = random();
        if ((((x % SPEC.grassEvery) + SPEC.grassEvery) % SPEC.grassEvery) === 3 && v > 0.3) put({ kind: 'grass', x, y: -1, color: v > 0.7 ? levelColors[2] : levelColors[1], order: 0 }, W / 2, -1, 0);
      }
    }
    const center = r.trees.length % 2 === 0 ? -0.5 : 0; // center an even row
    r.trees.forEach((levels, i) => {
      const kind = SPEC.order[(r.first + i) % SPEC.order.length] as TreeKind; // a tree keeps its kind
      const cells = treeCells(Math.round((side(i) + center) * layout.slot), kind, levels);
      const reach = Math.max(...cells.map((c) => -c.y)) * r.scale;
      for (const c of cells) put(c, room / 2, r.first + i, reach);
    });
  }
  return { width: W, height, groundY, trees: trees.length, blocks };
}

// The small meadow: the decks as they are now. `met` = the levels of each deck's met words (oldest deck first),
// `deckWords` = how many words each of those decks has. A word not met yet is a leaf in the lightest green.
// There is always one tree: with no deck it is a bare stem.
// `ghosts`: grey trees after the real ones, for the words still to come before the next stop of the future bar.
export function nowMeadow(met: number[][], deckWords: number[], ghosts = 0): Scene {
  const trees = met.map((levels, i) => [...levels, ...Array.from({ length: Math.max(0, (deckWords[i] ?? levels.length) - levels.length) }, () => 0)]);
  const ghostTrees = Array.from({ length: ghosts }, () => Array.from({ length: SPEC.wordsPerDeck }, () => GHOST));
  return layOut(trees.length || ghosts ? [...trees, ...ghostTrees] : [[]], NOW);
}

// The big meadow: the forest at the goal. One full tree per 33 words of the goal, three at least, in the strong
// greens (a mastered forest). The same goal always gives the same picture.
export function goalMeadow(goal: number): Scene {
  const n = Math.max(GOAL_MIN_TREES, Math.round(goal / GOAL_WORDS_PER_TREE));
  const trees = Array.from({ length: n }, (_, i) => {
    const random = rng(11 + i * 97);
    return Array.from({ length: SPEC.wordsPerDeck }, () => {
      const v = random();
      return v < 0.4 ? 5 : v < 0.75 ? 4 : 3;
    });
  });
  return layOut(trees, GOAL);
}

// The meadow of the future bar: the forest the learner has with `words` words, one full tree per 30 words, in the
// strong greens. A bigger forest is drawn with smaller blocks (the view moves back), so the picture never gets
// taller than `maxRatio` (height / width) and the page does not jump while the bar is dragged.
const FUTURE_CELLS = [36, 44, 54, 66, 80, 96, 116] as const;
export function futureMeadow(words: number, maxRatio: number): Scene {
  const n = Math.max(1, Math.round(words / SPEC.wordsPerDeck));
  const trees = Array.from({ length: n }, (_, i) => {
    const random = rng(11 + i * 97);
    return Array.from({ length: SPEC.wordsPerDeck }, () => {
      const v = random();
      return v < 0.4 ? 5 : v < 0.75 ? 4 : 3;
    });
  });
  let scene = layOut(trees, { cells: FUTURE_CELLS[0], slot: 9, margin: 3, reserve: 0 });
  for (const cells of FUTURE_CELLS) {
    scene = layOut(trees, { cells, slot: 9, margin: 3, reserve: 0 });
    if (scene.height / scene.width <= maxRatio) break;
  }
  return scene;
}
