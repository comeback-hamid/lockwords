import { StyleSheet, View } from 'react-native';

import { colors, levelColors, space } from '@/theme/theme';

// Figma: progress is a chain of level squares, one per word, shaded by the word's level. Never a bar.
export function LevelChain({ stages }: { stages: number[] }) {
  return (
    <View style={styles.chain} accessibilityLabel={`${stages.length} words`}>
      {stages.map((stage, i) => (
        <View key={i} testID="level-square" style={[styles.square, { backgroundColor: levelColors[stage] ?? levelColors[0] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chain: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[4] },
  square: { width: 10, height: 10, borderRadius: 2, borderWidth: 1, borderColor: colors.divider },
});
