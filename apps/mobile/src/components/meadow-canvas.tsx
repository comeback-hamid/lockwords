import { Canvas, createPicture, Picture, Skia, useClock, type SkCanvas } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { SPEC, type Scene } from '@/progress/meadow';
import { levelColors } from '@/theme/theme';

export type MeadowCanvasProps = { scene: Scene; width: number; rich: boolean; still: boolean };

// A screen left behind keeps its views. The meadow stops drawing a moment after its screen leaves the front, and
// grows again when the screen comes back (the same rule as Kai's canvas).
const HIDE_AFTER_MS = 400;

// How the meadow moves. All of it is computed per frame on the UI thread, in one Skia picture: no React render.
const MOTION = {
  growMs: 420, // one block popping in
  growStepMs: 34, // the next block of the same tree starts this much later
  growTreeMs: 160, // the next tree starts this much later
  sway: 0.85, // how far the top of a tree bends, in its own cells
  flutter: 0.07, // each leaf's own small shake, in cells
  grass: 0.28,
  shine: 0.32, // the white of the light that runs over the leaves
  fallMs: 5200, // one leaf falling to the ground
  moteCells: 0.3,
} as const;
const KIND = { ground: 0, grass: 1, trunk: 2, leaf: 3 } as const;

type Item = { x: number; y: number; s: number; r: number; g: number; b: number; a: number; k: number; bend: number; wx: number; delay: number; seed: number };
type Faller = { x: number; y: number; s: number; r: number; g: number; b: number; period: number; offset: number; drift: number; seed: number };
type Mote = { x: number; speed: number; seed: number };
type Data = { items: Item[]; fallers: Faller[]; motes: Mote[]; groundY: number; height: number; grown: number };

const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255] as const;
const MOTE = rgb(levelColors[2]); // the specks of light
// A fixed number from 0 to 1 for a block, so every phone shows the same shimmer.
const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// Everything the drawing needs, as plain numbers (made once per picture, on the JS thread).
function drawData(scene: Scene, rich: boolean): Data {
  const treeX = new Map<number, number>();
  for (const b of scene.blocks) if (b.tree >= 0 && b.kind === 'trunk' && !treeX.has(b.tree)) treeX.set(b.tree, b.x);
  const firstTree = Math.min(...scene.blocks.filter((b) => b.tree >= 0).map((b) => b.tree), 0);
  let grown = 0;
  const items = scene.blocks.map((b, i): Item => {
    const [r, g, bl] = rgb(b.color);
    const inTree = b.tree >= 0;
    const delay = inTree ? (b.tree - firstTree) * MOTION.growTreeMs + b.order * MOTION.growStepMs : 0;
    grown = Math.max(grown, delay + MOTION.growMs);
    return {
      x: b.x, y: b.y, s: b.size, r, g, b: bl, a: b.opacity, k: KIND[b.kind],
      // The wind bends a tree like a blade: nothing at the foot, most at the top.
      bend: inTree && b.reach > 0 ? Math.pow(b.lift / b.reach, 1.7) * b.size : 0,
      wx: inTree ? (treeX.get(b.tree) ?? b.x) : b.x,
      delay,
      seed: hash(i + 1),
    };
  });
  const leaves = scene.blocks.filter((b) => b.kind === 'leaf' && b.opacity === 1 && b.lift > 3);
  const count = Math.min(leaves.length, rich ? 7 : 2);
  const fallers = Array.from({ length: count }, (_, i): Faller => {
    const leaf = leaves[Math.floor(hash(i + 50) * leaves.length)]!;
    const [r, g, b] = rgb(leaf.color);
    return { x: leaf.x, y: leaf.y, s: leaf.size * 0.7, r, g, b, period: 7000 + hash(i + 60) * 6000, offset: hash(i + 70) * 12000, drift: (hash(i + 80) - 0.3) * 3, seed: hash(i + 90) };
  });
  const motes = rich ? Array.from({ length: 12 }, (_, i): Mote => ({ x: 1 + hash(i + 100) * (scene.width - 2), speed: 0.25 + hash(i + 110) * 0.35, seed: hash(i + 120) })) : [];
  return { items, fallers, motes, groundY: scene.groundY, height: scene.height, grown };
}

export function MeadowCanvas(props: MeadowCanvasProps) {
  const focused = useIsFocused();
  const [live, setLive] = useState(focused);
  useEffect(() => {
    const t = setTimeout(() => setLive(focused), focused ? 0 : HIDE_AFTER_MS);
    return () => clearTimeout(t);
  }, [focused]);
  if (props.width <= 0 || (!live && !focused)) return null;
  return <LiveCanvas {...props} />;
}

function LiveCanvas({ scene, width, rich, still }: MeadowCanvasProps) {
  const u = width / scene.width; // points per cell
  const height = Math.round(scene.height * u);
  const data = useMemo(() => drawData(scene, rich), [scene, rich]);
  const clock = useClock();
  const start = useSharedValue(-1);

  const picture = useDerivedValue(() => {
    if (start.value < 0) start.value = clock.value;
    const t = clock.value - start.value;
    return createPicture((canvas) => drawMeadow(canvas, data, t, u, still), { width, height });
  });

  return (
    <Canvas style={{ width, height }}>
      <Picture picture={picture} />
    </Canvas>
  );
}

function drawMeadow(canvas: SkCanvas, d: Data, ms: number, u: number, still: boolean) {
  'worklet';
  const t = ms / 1000;
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const radius = SPEC.cell.radius;
  const block = (x: number, y: number, s: number, r: number, g: number, b: number, a: number) => {
    if (a <= 0.004 || s <= 0) return;
    paint.setColor(Float32Array.of(r, g, b, a > 1 ? 1 : a));
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x * u, y * u, s * u, s * u), radius * s * u, radius * s * u), paint);
  };
  // The wind: a slow gust that comes and goes, with two faster waves on top. It runs across the meadow from the left.
  const wind = (x: number) => {
    const gust = 0.55 + 0.45 * Math.sin(t * 0.37 + 1.1);
    return gust * (0.6 * Math.sin(t * 1.15 - x * 0.09) + 0.28 * Math.sin(t * 2.3 - x * 0.21 + 1.7) + 0.12 * Math.sin(t * 4.1 - x * 0.4));
  };

  for (const b of d.items) {
    let dx = 0, dy = 0, scale = 1, shine = 0;
    if (!still) {
      if (b.k >= KIND.trunk) {
        const p = (ms - b.delay) / MOTION.growMs;
        if (p <= 0) continue;
        if (p < 1) {
          // Pop in with a small overshoot.
          const q = p - 1;
          scale = 1 + 2.7 * q * q * q + 1.7 * q * q;
        }
        const w = wind(b.wx);
        dx = b.bend * w * MOTION.sway;
        dy = Math.abs(dx) * 0.12;
        if (b.k === KIND.leaf) {
          dx += MOTION.flutter * b.s * Math.sin(t * 5.3 + b.seed * 40) * (0.4 + Math.abs(w));
          dy += MOTION.flutter * b.s * Math.sin(t * 4.1 + b.seed * 17);
          // A band of light runs over the leaves.
          const band = Math.sin(t * 0.9 - b.x * 0.22 + b.y * 0.15 + b.seed * 0.6);
          if (band > 0.8) shine = ((band - 0.8) / 0.2) * MOTION.shine;
        }
      } else if (b.k === KIND.grass) {
        dx = MOTION.grass * b.s * wind(b.x);
      }
    }
    const s = b.s * scale;
    // A growing block stands on its own bottom edge.
    const x = b.x + dx + (b.s - s) / 2, y = b.y + dy + (b.s - s);
    block(x, y, s, b.r, b.g, b.b, b.a);
    if (shine > 0) block(x, y, s, 1, 1, 1, shine * b.a);
  }
  if (still || ms < d.grown) return;

  // Leaves that let go, drift down and fade on the ground.
  for (const f of d.fallers) {
    const p = ((ms + f.offset) % f.period) / MOTION.fallMs;
    if (p >= 1) continue;
    const y = f.y + (d.groundY - f.s - f.y) * p * p * (3 - 2 * p);
    const x = f.x + f.drift * p + 0.9 * Math.sin(p * 9 + f.seed * 6);
    const a = Math.min(1, p * 8) * (p > 0.8 ? (1 - p) / 0.2 : 1);
    canvas.save();
    canvas.rotate(40 * Math.sin(p * 11 + f.seed * 5), (x + f.s / 2) * u, (y + f.s / 2) * u);
    block(x, y, f.s, f.r, f.g, f.b, a);
    canvas.restore();
  }
  // Small bright specks that float up through the trees.
  const [mr, mg, mb] = MOTE;
  const span = d.groundY - 1;
  for (const m of d.motes) {
    const up = (t * m.speed + m.seed * span) % span;
    const edge = Math.min(up, span - up) / 1.5;
    const a = 0.75 * (edge > 1 ? 1 : edge) * (0.55 + 0.45 * Math.sin(t * 2.2 + m.seed * 30));
    block(m.x + 1.1 * Math.sin(t * 0.6 + m.seed * 9), d.groundY - 0.5 - up, MOTION.moteCells, mr, mg, mb, a);
  }
}
