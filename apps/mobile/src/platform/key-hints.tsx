import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, radius, space, type } from '@/theme/theme';

import { webMode } from './web-layout';

const KEYS = [
  ['Space', 'flip'],
  ['←', 'hard'],
  ['↑', 'know it'],
  ['→', 'easy'],
  ['⌫', 'undo'],
] as const;

// The review card's keys, named in one quiet line under the card (Figma Web · W2). Only on a wide window in a
// browser: that is where a real keyboard is. `windowWidth` is for tests.
export function KeyHints({ windowWidth }: { windowWidth?: number }) {
  const { width } = useWindowDimensions();
  if (webMode(windowWidth ?? width) !== 'desktop') return null;
  return (
    <View
      accessible
      accessibilityLabel="Keys: Space flips the card, left arrow is Hard, up arrow is Know it, right arrow is Easy, Backspace takes the last answer back"
      style={styles.row}>
      {KEYS.map(([key, does]) => (
        <View key={key} style={styles.pair}>
          <View style={styles.cap}>
            <Text style={[type.label, styles.key]}>{key}</Text>
          </View>
          <Text style={[type.caption, styles.does]}>{does}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: space[16], paddingTop: space[8] },
  pair: { flexDirection: 'row', alignItems: 'center', gap: space[4] + 2 },
  cap: { minWidth: 24, height: 24, paddingHorizontal: space[4] + 2, alignItems: 'center', justifyContent: 'center', borderRadius: radius.badge, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  key: { color: colors.text2, letterSpacing: 0 },
  does: { color: colors.muted },
});
