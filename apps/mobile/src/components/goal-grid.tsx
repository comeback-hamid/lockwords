import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, levelColors, levelNew } from '@/theme/theme';

const PER_ROW = 20;
const GAP = 2;

// The goal grid (Figma P1): one square per word of the goal. A word in the bank is green by its level (a new word in
// the lightest green, as in Figma); a word that has not come yet is grey. `levels` come from the server, highest first.
export function GoalGrid({ goal, levels }: { goal: number; levels: number[] }) {
  // 20 squares fill a row: their size comes from the measured width (percent sizes do not work in a wrapping row).
  const [width, setWidth] = useState(0);
  // One point is left over, so rounding on the phone never pushes the 20th square to the next row.
  const size = width ? Math.floor(((width - 1 - (PER_ROW - 1) * GAP) / PER_ROW) * 10) / 10 : 0;
  const squares = Array.from({ length: Math.max(goal, levels.length) }, (_, i) => (i < levels.length ? levels[i]! : null));
  return (
    <View testID="goal-grid" style={styles.grid} accessible accessibilityLabel={`${levels.length} of ${goal} words`} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {squares.map((level, i) => (
        <View
          key={i}
          testID={level === null ? 'grid-empty' : 'grid-level'}
          style={{ width: size, height: size, borderRadius: 2, backgroundColor: level === null ? colors.divider : level < 1 ? levelNew : (levelColors[level] ?? levelColors[1]) }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});
