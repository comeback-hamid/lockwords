import { useEffect, useMemo, useRef } from 'react';
import Svg, { Rect } from 'react-native-svg';

import { loopOnCanvas, sharpContext } from '@/platform/frame-loop';
import { SPEC } from '@/progress/meadow';
import { CELL_RADIUS, meadowData, paintMeadow, type Painter } from '@/progress/meadow-motion';

import type { MeadowCanvasProps } from './meadow-canvas';

// The meadow in a browser. It grows in and moves in the wind as on the phone: the motion comes from
// progress/meadow-motion.ts and the browser's own 2D canvas draws it.
// With Reduce Motion, and where there is no browser page (Jest), it is a still picture of the same blocks.
export function MeadowCanvas(props: MeadowCanvasProps) {
  if (props.still || typeof document === 'undefined') return StillMeadow(props);
  if (props.width <= 0) return null;
  return <LiveMeadow {...props} />;
}

function LiveMeadow({ scene, width, rich }: MeadowCanvasProps) {
  const u = width / scene.width; // pixels per cell
  const height = Math.round(scene.height * u);
  const canvas = useRef<HTMLCanvasElement>(null);
  const data = useMemo(() => meadowData(scene, rich), [scene, rich]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = sharpContext(el, width, height);
    if (!ctx) return;
    const painter: Painter = {
      block(x, y, s, r, g, b, a) {
        ctx.fillStyle = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
        ctx.beginPath();
        ctx.roundRect(x * u, y * u, s * u, s * u, CELL_RADIUS * s * u);
        ctx.fill();
      },
      save: () => ctx.save(),
      restore: () => ctx.restore(),
      rotate(degrees, cx, cy) {
        ctx.translate(cx * u, cy * u);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.translate(-cx * u, -cy * u);
      },
    };
    return loopOnCanvas(el, (ms) => {
      ctx.clearRect(0, 0, width, height);
      paintMeadow(painter, data, ms, false);
    });
  }, [data, width, height, u]);

  return <canvas ref={canvas} data-testid="meadow-live" style={{ width, height, display: 'block' }} />;
}

function StillMeadow({ scene }: MeadowCanvasProps) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${scene.width} ${scene.height}`}>
      {scene.blocks.map((b, i) => (
        <Rect key={i} testID={`meadow-${b.kind}`} x={b.x} y={b.y} width={b.size} height={b.size} rx={SPEC.cell.radius * b.size} fill={b.color} opacity={b.opacity} />
      ))}
    </Svg>
  );
}
