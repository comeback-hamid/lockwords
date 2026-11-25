import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { place, pointAt, wordsText, type Stop } from '@/progress/future';
import { colors, levelColors, radius, space, type } from '@/theme/theme';

const HANDLE = 28;
const TRACK = 10;

type Props = {
  total: number; // the words in the word bank today
  stops: Stop[]; // the stops still ahead
  peek: number; // -1 = today, or the index of the stop the learner looks at
  onPeek(index: number): void;
};

// The future bar (Figma P1 · Future bar). Dark green = today. A drag moves the handle to the stops ahead (light
// green = the peek); letting go puts it back on today. A screen reader moves it with its "increase" and "decrease".
export function FutureBar({ total, stops, peek, onPeek }: Props) {
  const [width, setWidth] = useState(0);
  const today = place(total);
  const pan = useMemo(
    () =>
      PanResponder.create({
        // A sideways drag is ours; an up or down drag scrolls the page.
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => {
          if (width > 0) onPeek(pointAt(place(total) + g.dx / width, total, stops));
        },
        onPanResponderRelease: () => onPeek(-1),
        onPanResponderTerminate: () => onPeek(-1),
      }),
    // None of these change while a finger is on the bar (the parent keeps `stops` and `onPeek` the same).
    [width, total, stops, onPeek],
  );
  const at = peek < 0 ? today : place(stops[peek]!.words);
  const shown = peek < 0 ? total : stops[peek]!.words;
  const marks = [0, 100, 200, 500, 1000];
  return (
    <View style={styles.root}>
      <View
        testID="future-bar"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Your future"
        accessibilityValue={{ text: peek < 0 ? `Today, ${wordsText(total)} words` : `${wordsText(shown)} words` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onPeek(e.nativeEvent.actionName === 'increment' ? Math.min(stops.length - 1, peek + 1) : Math.max(-1, peek - 1))}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.bar}
        {...pan.panHandlers}
      >
        <View style={styles.track} />
        {peek >= 0 ? <View testID="future-peek" style={[styles.fill, styles.peek, { width: `${at * 100}%` }]} /> : null}
        <View testID="future-today" style={[styles.fill, { width: `${today * 100}%` }]} />
        <View style={[styles.handle, peek >= 0 && styles.handlePeek, { left: Math.max(0, Math.min(width - HANDLE, at * width - HANDLE / 2)) }]} />
      </View>
      <View style={styles.marks} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {marks.map((m) => (
          <Text key={m} style={[m === shown ? type.captionStrong : type.caption, m === shown ? styles.on : styles.off]}>
            {wordsText(m)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', gap: space[8] },
  bar: { height: HANDLE + space[16], justifyContent: 'center' },
  track: { height: TRACK, borderRadius: radius.pill, backgroundColor: colors.chip },
  fill: { position: 'absolute', left: 0, height: TRACK, borderRadius: radius.pill, backgroundColor: colors.button },
  peek: { backgroundColor: levelColors[1] },
  handle: { position: 'absolute', width: HANDLE, height: HANDLE, borderRadius: radius.pill, borderWidth: 3, borderColor: colors.button, backgroundColor: colors.white },
  handlePeek: { borderColor: colors.greenText },
  marks: { flexDirection: 'row', justifyContent: 'space-between' },
  on: { color: colors.text },
  off: { color: colors.muted },
});
