import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Content that fades in and rises a little when its screen opens. Reanimated runs it on the UI thread,
// and shows it at once when Reduce Motion is on. Jest swaps it for a plain view (`jest.setup.tsx`).
export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <Animated.View entering={FadeInDown.delay(delay).duration(450)}>{children}</Animated.View>;
}
