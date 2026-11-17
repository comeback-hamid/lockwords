import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/theme';

// Figma "Typing bubble": three gray dots in a Kai bubble while Kai writes the next line.
// shortcut: `kai-chat-live` (PR #20) adds its own TypingBubble to chat-bubble.tsx. When it is merged, use that one and delete this file.
export function TypingBubble() {
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.35)));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let live = true;
    // With Reduce Motion the dots stay still.
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!live || reduce) return;
      const pulse = (v: Animated.Value) =>
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.35, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]);
      loop = Animated.loop(Animated.stagger(160, dots.map(pulse)));
      loop.start();
    });
    return () => {
      live = false;
      loop?.stop();
    };
  }, [dots]);
  return (
    <View accessible accessibilityLabel="Kai is typing" style={styles.bubble}>
      {dots.map((opacity, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, height: 44, paddingHorizontal: 16, borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.subtle },
});
