import { colors, levelColors } from '@/theme/theme';

// The pixel meadow of the Progress tab: one tree per deck, one leaf block per met word, in the green of its level.
// A port of `drawForest` in docs/design/pixel-meadow.html. All numbers come from that file's SPEC and FOREST.
// Pure: decks in, a list of blocks out. src/components/meadow.tsx only draws them.
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
  width: 60, // cells across
  slot: 9, // cells between tree centers
  grassEvery: 6,
} as const;
// Many decks: several rows with depth. Each row back is smaller, sits higher and is a little paler.
const FOREST = { shrink: 0.66, rise: 9.5, fade: 0.08, minOpacity: 0.55, tallest: 12.5 } as const;

type TreeKind = keyof typeof SPEC.trees;
export type Block = { kind: 'ground' | 'grass' | 'trunk' | 'leaf'; x: number; y: number; size: number; color: string; opacity: number };
type Cell = { kind: Block['kind']; x: number; y: number; color: string }; // in one row's own cells; y 0 = the ground row, up is negative

// The spec's small random source, so the grass is the same on every phone.
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

// One tree standing on the ground at column cx. `levels` = the levels of the deck's met words.
function treeCells(cx: number, kind: TreeKind, allLevels: number[]): Cell[] {
  const levels = allLevels.slice(0, SPEC.wordsPerDeck);
  const n = levels.length;
  const leaf = (level: number) => levelColors[level] ?? levelColors[0];
  const out: Cell[] = [];
  if (n < 4) {
    // A sprout: a stem and up to 3 leaf blocks. A deck with no met word is the bare stem.
    const stemH = n >= 2 ? 2 : 1;
    for (let h = 0; h < stemH; h++) out.push({ kind: 'trunk', x: cx, y: -1 - h, color: colors.subtle });
    const spots = [[-1, 0], [1, 0], [2, -1]] as const;
    for (let i = 0; i < n; i++) out.push({ kind: 'leaf', x: cx + spots[i]![0], y: -1 - stemH + spots[i]![1], color: leaf(levels[i]!) });
    return out;
  }
  const t = SPEC.trees[kind];
  const mid = t.rows[0] % 2 === 1 ? cx + 0.5 : cx; // keep every block on the whole-cell grid
  const trunkH = Math.max(1, Math.min(t.trunkMax, Math.ceil(n / 8)));
  for (let h = 0; h < trunkH; h++) {
    for (let w = 0; w < t.trunkW; w++) out.push({ kind: 'trunk', x: mid - t.trunkW / 2 + w, y: -1 - h, color: t.lightTrunk && h % 2 === 1 ? colors.lineStrong : colors.subtle });
  }
  const cells = canopyCells(kind);
  for (let i = 0; i < n; i++) out.push({ kind: 'leaf', x: mid + cells[i]!.x - 0.5, y: -1 - trunkH - cells[i]!.row, color: leaf(levels[i]!) });
  return out;
}

// The n-th tree of a row: the first in the center, then right, left, right, left ...
const side = (i: number) => (i === 0 ? 0 : i % 2 === 1 ? (i + 1) / 2 : -(i / 2));

// `trees`: one list of levels per deck, oldest deck first. Returns the picture's size in cells and every block in it.
export function meadowBlocks(trees: number[][]): { width: number; height: number; blocks: Block[] } {
  const W = SPEC.width;
  // Rows from front to back, enough to hold every deck. The front row has the newest decks at full size.
  const rows: { scale: number; cap: number; off: number; trees: number[][]; first: number }[] = [];
  let left = Math.max(1, trees.length);
  for (let k = 0; left > 0 && k < 9; k++) {
    const scale = Math.pow(FOREST.shrink, k);
    const cap = Math.max(1, Math.floor((W - 4) / (SPEC.slot * scale)));
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
    const half = Math.ceil(W / 2 / r.scale);
    const cells: Cell[] = [];
    for (let x = -half; x < half; x++) cells.push({ kind: 'ground', x, y: 0, color: colors.line });
    if (k === 0) {
      for (let x = -half + 2; x < half - 1; x++) {
        const v = random();
        if ((((x % SPEC.grassEvery) + SPEC.grassEvery) % SPEC.grassEvery) === 3 && v > 0.3) cells.push({ kind: 'grass', x, y: -1, color: v > 0.7 ? levelColors[2] : levelColors[1] });
      }
    }
    const center = r.trees.length % 2 === 0 ? -0.5 : 0; // center an even row
    r.trees.forEach((levels, i) => {
      const kind = SPEC.order[(r.first + i) % SPEC.order.length] as TreeKind; // a deck keeps its kind of tree
      cells.push(...treeCells(Math.round((side(i) + center) * SPEC.slot), kind, levels));
    });
    for (const c of cells) {
      const x = W / 2 + (c.x + gap / 2) * r.scale;
      const size = (1 - gap) * r.scale;
      if (x < 0 || x + size > W) continue; // the ground of a small row runs past the edge
      blocks.push({ kind: c.kind, x, y: groundY - r.off + (c.y + gap / 2) * r.scale, size, color: c.color, opacity });
    }
  }
  return { width: W, height, blocks };
}
