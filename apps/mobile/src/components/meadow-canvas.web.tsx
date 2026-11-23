import Svg, { Rect } from 'react-native-svg';

import { SPEC } from '@/progress/meadow';

import type { MeadowCanvasProps } from './meadow-canvas';

// The meadow in a browser, and in Jest: a still picture of the same blocks (no Skia there).
export function MeadowCanvas({ scene }: MeadowCanvasProps) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${scene.width} ${scene.height}`}>
      {scene.blocks.map((b, i) => (
        <Rect key={i} testID={`meadow-${b.kind}`} x={b.x} y={b.y} width={b.size} height={b.size} rx={SPEC.cell.radius * b.size} fill={b.color} opacity={b.opacity} />
      ))}
    </Svg>
  );
}
