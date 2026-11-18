import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme/theme';

// Figma Chat bubble. Kai: white, on the left. User: green, on the right. **word** in the text is bold.
export function ChatBubble({ from, text }: { from: 'kai' | 'user'; text: string }) {
  const parts = text.split('**'); // odd parts are bold
  const plain = parts.join('');
  return (
    <View accessible accessibilityLabel={`${from === 'kai' ? 'Kai' : 'You'}: ${plain}`} style={[styles.bubble, from === 'kai' ? styles.kai : styles.user]}>
      <Text style={[type.body, styles.text]}>
        {parts.map((part, i) =>
          i % 2 ? (
            <Text key={i} style={[type.bodyStrong, styles.text]}>
              {part}
            </Text>
          ) : (
            part
          ),
        )}
      </Text>
    </View>
  );
}

// Kai is typing: a Kai bubble with three gray dots that rise in turn. Reduce Motion: still dots.
const DOT_MS = 300; // up, then down
const DOT_STAGGER_MS = 150;

export function TypingBubble() {
  const [lift] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (still) => {
        if (!live || still) return;
        loops = lift.map((v, i) =>
          Animated.loop(
            Animated.sequence([
              Animated.delay(i * DOT_STAGGER_MS),
              Animated.timing(v, { toValue: 1, duration: DOT_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(v, { toValue: 0, duration: DOT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              Animated.delay((2 - i) * DOT_STAGGER_MS),
            ]),
          ),
        );
        loops.forEach((l) => l.start());
      },
      () => {},
    );
    return () => {
      live = false;
      loops.forEach((l) => l.stop());
    };
  }, [lift]);
  return (
    <View accessible accessibilityLabel="Kai is typing" style={[styles.bubble, styles.kai, styles.dots]}>
      {lift.map((v, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.control },
  kai: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  user: { alignSelf: 'flex-end', backgroundColor: colors.greenBg, marginVertical: space[8] },
  text: { color: colors.text },
  dots: { flexDirection: 'row', gap: space[4], paddingVertical: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
});
