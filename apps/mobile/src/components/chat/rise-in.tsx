import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

// A tapped reply option rises from the options (just above the composer) into the chat as the user's bubble.
// Reduce Motion: the bubble just appears.
const RISE_MS = 300;
const RISE_FROM = 120; // points below its place: where the pills were

export function RiseIn({ children }: { children: ReactNode }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (still) => {
        if (!live) return;
        if (still) t.setValue(1);
        else Animated.timing(t, { toValue: 1, duration: RISE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      },
      () => t.setValue(1),
    );
    return () => {
      live = false;
    };
  }, [t]);
  return (
    <Animated.View style={{ opacity: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 1] }), transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [RISE_FROM, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}
