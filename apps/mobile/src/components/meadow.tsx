import { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';

import { meadowBlocks, SPEC } from '@/progress/meadow';

// The pixel meadow (Figma P1): draws the blocks that src/progress/meadow.ts lays out. `trees` = the levels of each
// deck's met words, oldest deck first.
export function Meadow({ trees }: { trees: number[][] }) {
  const { width, height, blocks } = useMemo(() => meadowBlocks(trees), [trees]);
  return (
    <Svg width="100%" style={{ aspectRatio: width / height }} viewBox={`0 0 ${width} ${height}`} accessibilityRole="image" accessibilityLabel={`Your meadow: ${trees.length} ${trees.length === 1 ? 'tree' : 'trees'}`}>
      {blocks.map((b, i) => (
        <Rect key={i} testID={`meadow-${b.kind}`} x={b.x} y={b.y} width={b.size} height={b.size} rx={SPEC.cell.radius * b.size} fill={b.color} opacity={b.opacity} />
      ))}
    </Svg>
  );
}
