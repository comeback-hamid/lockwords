import { StyleSheet, View } from 'react-native';

import { colors, levelColor, space } from '@/theme/theme';

// Figma: progress is a chain of level squares, one per word, shaded by the word's level. Never a bar.
// `start`: the squares begin at the left (in a list row); without it they are centered.
export function LevelChain({ stages, start = false }: { stages: number[]; start?: boolean }) {
  return (
    <View style={[styles.chain, start && styles.start]} accessibilityLabel={`${stages.length} words`}>
      {stages.map((stage, i) => (
        <View key={i} testID="level-square" style={[styles.square, { backgroundColor: levelColor(stage) }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chain: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[4] },
  start: { justifyContent: 'flex-start' },
  square: { width: 10, height: 10, borderRadius: 2, borderWidth: 1, borderColor: colors.divider },
});
