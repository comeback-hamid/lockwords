import { KAI_LEAF_PIVOT, KAI_PIVOT, KAI_SPIN_CENTER, type KaiFrame } from './step';

// Kai on the browser's own 2D canvas. A line-by-line port of `drawFrame` in kai-canvas.tsx (Skia, the phone):
// same order, same transforms. The frame comes from the same step function, so all of Kai's rules stay in one place.
// Only what the drawer uses of the canvas, so a test can pass a recorder.
export type Ctx2D = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  rotate(radians: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, rotation: number, start: number, end: number): void;
  roundRect(x: number, y: number, w: number, h: number, r: number): void;
  fill(): void;
  fillText(text: string, x: number, y: number): void;
};

const RAD = Math.PI / 180;
// The page draws "?" and "!" in a bold monospace font, 4.5 units high.
const FONT = 'bold 4.5px Menlo, Consolas, monospace';

// `u` = pixels per spec unit (a whole number keeps the squares sharp); `ox`, `oy` = where the view box starts.
export function drawKaiFrame(ctx: Ctx2D, f: KaiFrame, u: number, ox: number, oy: number) {
  const color = (c: number[], a: number) => {
    ctx.fillStyle = `rgba(${Math.round(c[0]!)},${Math.round(c[1]!)},${Math.round(c[2]!)},${Math.max(0, Math.min(1, a))})`;
  };
  // Skia's rotate(degrees, px, py): turn around a point.
  const turn = (degrees: number, px: number, py: number) => {
    ctx.translate(px, py);
    ctx.rotate(degrees * RAD);
    ctx.translate(-px, -py);
  };
  const [px, py] = KAI_PIVOT as [number, number], [qx, qy] = KAI_SPIN_CENTER as [number, number], [lpx, lpy] = KAI_LEAF_PIVOT as [number, number];

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(u, u);

  const s = f.shadow;
  color(s.color, s.a);
  ctx.beginPath();
  ctx.ellipse(s.cx, s.cy, s.rx, s.ry, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const r of f.fx) {
    if (r.a <= 0.001 || r.w <= 0 || r.h <= 0) continue;
    color(r.color, r.a);
    if (r.r > 0) {
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, r.r);
      ctx.fill();
    } else ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  ctx.font = FONT;
  for (const t of f.text) {
    if (t.a <= 0.001) continue;
    color(t.color, t.a);
    ctx.fillText(t.text, t.x, t.y);
  }

  const p = f.pose;
  ctx.save();
  ctx.translate(p.tx, p.ty);
  turn(p.lean, px, py);
  ctx.translate(px, py);
  ctx.scale(p.sx, p.sy);
  ctx.translate(-px, -py);
  turn(p.spin, qx, qy);
  for (const group of ['stem', 'leafL', 'leafR', 'body'] as const) {
    const leaf = group === 'leafL' ? f.leafL : group === 'leafR' ? f.leafR : null;
    if (leaf) {
      ctx.save();
      ctx.translate(0, leaf.dy);
      ctx.translate(lpx, lpy);
      ctx.scale(leaf.s, leaf.s);
      ctx.rotate(leaf.rot * RAD);
      ctx.translate(-lpx, -lpy);
    }
    for (const part of f.parts) {
      if (part.group !== group || part.a <= 0.001 || part.w <= 0 || part.h <= 0) continue;
      color(part.color, part.a);
      ctx.fillRect(part.x, part.y, part.w, part.h);
    }
    if (leaf) ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}
