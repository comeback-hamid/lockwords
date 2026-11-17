import { Canvas, createPicture, matchFont, Picture, Skia, useClock, type SkCanvas, type SkFont } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { createMemory, KAI_LEAF_PIVOT, KAI_PIVOT, KAI_SPIN_CENTER, KAI_VIEWBOX, stepCharacter, type KaiFrame, type KaiInput, type KaiMemory } from './step';

export type KaiCanvasProps = { state: string; playKey: number; progress?: number; still: boolean; width: number };

// A screen left behind in the stack keeps its views. Kai stops drawing a moment after its screen leaves the front
// (the slide away still shows it), so a hidden Kai never keeps the phone, or Maestro, waiting for the screen to settle.
const HIDE_AFTER_MS = 400;

export function KaiCanvas(props: KaiCanvasProps) {
  const focused = useIsFocused();
  const [live, setLive] = useState(focused);
  useEffect(() => {
    const t = setTimeout(() => setLive(focused), focused ? 0 : HIDE_AFTER_MS);
    return () => clearTimeout(t);
  }, [focused]);
  const [, , vw, vh] = KAI_VIEWBOX;
  if (!live && !focused) return <View style={{ width: props.width, height: Math.round((props.width * vh) / vw) }} />;
  return <LiveCanvas {...props} />;
}

// One Skia picture per frame, made on the UI thread: no React render per frame (CHARACTER.html 11.5).
function LiveCanvas({ state, playKey, progress, still, width }: KaiCanvasProps) {
  const [vx, vy, vw, vh] = KAI_VIEWBOX;
  const height = Math.round((width * vh) / vw);
  // Whole points per unit, as the page does, so Kai stays crisp.
  const u = Math.max(1, Math.floor(width / vw));
  const ox = (width - u * vw) / 2 - vx * u, oy = (height - u * vh) / 2 - vy * u;

  const clock = useClock();
  const memory = useSharedValue<KaiMemory | null>(null);
  const input = useSharedValue<KaiInput>({ state, playKey, progress: progress ?? -1, still });
  useEffect(() => {
    input.value = { state, playKey, progress: progress ?? -1, still };
  }, [input, state, playKey, progress, still]);
  // The page draws "?" and "!" in a bold monospace font.
  const font = useMemo(() => matchFont({ fontFamily: 'Menlo', fontSize: 4.5, fontWeight: 'bold' }), []);

  const picture = useDerivedValue(() => {
    // Kai's memory lives on the UI thread only: Worklets freezes objects seen on the JS thread.
    if (!(globalThis as { _WORKLET?: boolean })._WORKLET) return createPicture(() => {}, { width, height });
    let m = memory.value;
    if (!m) {
      m = createMemory();
      memory.value = m;
    }
    const frame = stepCharacter(m, input.value, clock.value);
    return createPicture((canvas) => drawFrame(canvas, frame, u, ox, oy, font), { width, height });
  });

  return (
    <Canvas style={{ width, height }}>
      <Picture picture={picture} />
    </Canvas>
  );
}

function drawFrame(canvas: SkCanvas, f: KaiFrame, u: number, ox: number, oy: number, font: SkFont) {
  'worklet';
  const paint = Skia.Paint();
  paint.setAntiAlias(false);
  const color = (c: number[], a: number) => paint.setColor(Float32Array.of(c[0] / 255, c[1] / 255, c[2] / 255, Math.max(0, Math.min(1, a))));
  const rect = (x: number, y: number, w: number, h: number, r = 0) => {
    if (w <= 0 || h <= 0) return;
    if (r > 0) canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(x, y, w, h), r, r), paint);
    else canvas.drawRect(Skia.XYWHRect(x, y, w, h), paint);
  };
  const [px, py] = KAI_PIVOT, [qx, qy] = KAI_SPIN_CENTER, [lpx, lpy] = KAI_LEAF_PIVOT;

  canvas.save();
  canvas.translate(ox, oy);
  canvas.scale(u, u);

  const s = f.shadow;
  color(s.color, s.a);
  canvas.drawOval(Skia.XYWHRect(s.cx - s.rx, s.cy - s.ry, s.rx * 2, s.ry * 2), paint);

  for (const r of f.fx) {
    if (r.a <= 0.001) continue;
    color(r.color, r.a);
    rect(r.x, r.y, r.w, r.h, r.r);
  }
  for (const t of f.text) {
    if (t.a <= 0.001) continue;
    color(t.color, t.a);
    canvas.drawText(t.text, t.x, t.y, paint, font);
  }

  const p = f.pose;
  canvas.save();
  canvas.translate(p.tx, p.ty);
  canvas.rotate(p.lean, px, py);
  canvas.translate(px, py);
  canvas.scale(p.sx, p.sy);
  canvas.translate(-px, -py);
  canvas.rotate(p.spin, qx, qy);
  for (const group of ['stem', 'leafL', 'leafR', 'body'] as const) {
    const leaf = group === 'leafL' ? f.leafL : group === 'leafR' ? f.leafR : null;
    if (leaf) {
      canvas.save();
      canvas.translate(0, leaf.dy);
      canvas.translate(lpx, lpy);
      canvas.scale(leaf.s, leaf.s);
      canvas.rotate(leaf.rot, 0, 0);
      canvas.translate(-lpx, -lpy);
    }
    for (const part of f.parts) {
      if (part.group !== group || part.a <= 0.001) continue;
      color(part.color, part.a);
      rect(part.x, part.y, part.w, part.h);
    }
    if (leaf) canvas.restore();
  }
  canvas.restore();
  canvas.restore();
}
