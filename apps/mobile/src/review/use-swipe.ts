import { useCallback, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Direction } from '@/api/client';
import { flyTarget, labelStrength, swipeDirection } from '@/review/swipe';
import { card as cardTokens } from '@/theme/theme';

const GONE = { easy: 1, hard: 2, known: 3 } as const;
const BACK = { damping: 20, stiffness: 260, mass: 0.6 };
const TILT = 8; // degrees at 200 points (Figma A5: the dragged card)
const BUTTON_FLY_MS = 320; // from a button the card starts at rest, so it gets a little longer to show its label

// The drag of a card, all on the UI thread: the card follows the finger, and a release past the threshold sends
// it off the screen in the same frame. `onSwipe` (React side) is told at that moment; nothing here waits for it.
// `lead` is shared with the card underneath: how far this drag is (0..1), so it can rise as this one leaves.
export function useSwipe({ enabled, lead, onSwipe }: { enabled: boolean; lead: SharedValue<number>; onSwipe(direction: Direction): void }) {
  const { width, height } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const gone = useSharedValue(0); // 0 = here; else GONE[direction]

  const latest = useRef(onSwipe);
  useEffect(() => {
    latest.current = onSwipe;
  });
  const tell = useCallback((direction: Direction) => latest.current(direction), []);
  // A finger that dragged the card must not also count as a tap when it lifts (the card would flip).
  const dragged = useRef(false);
  const markDragged = useCallback(() => {
    dragged.current = true;
  }, []);
  const touchStart = useCallback(() => {
    dragged.current = false;
  }, []);
  const wasDrag = useCallback(() => dragged.current, []);

  // Sends the card off. Safe to call from React (a button) and from the gesture.
  const flyOff = useCallback(
    (direction: Direction, ms: number = cardTokens.flyMs) => {
      'worklet';
      if (gone.get()) return;
      gone.set(GONE[direction]);
      const to = flyTarget(direction, y.get(), width, height);
      const timing = { duration: ms, easing: Easing.out(Easing.quad) };
      x.set(withTiming(to.x, timing));
      y.set(withTiming(to.y, timing));
    },
    [gone, x, y, width, height],
  );

  const pan = usePanGesture({
    enabled,
    // The card takes the finger after a small move sideways or up. A tap stays a tap (flip, speaker, Use it).
    activeOffsetX: [-10, 10],
    activeOffsetY: -10,
    onBegin: () => {
      'worklet';
      scheduleOnRN(touchStart);
    },
    onActivate: () => {
      'worklet';
      scheduleOnRN(markDragged);
    },
    onUpdate: (e) => {
      'worklet';
      if (gone.get()) return;
      x.set(e.translationX);
      y.set(e.translationY);
      const s = labelStrength(e.translationX, e.translationY);
      lead.set(Math.max(s.easy, s.hard, s.known));
    },
    onDeactivate: (e) => {
      'worklet';
      if (gone.get()) return;
      const direction = e.canceled ? null : swipeDirection(x.get(), y.get(), e.velocityX, e.velocityY);
      if (direction) {
        flyOff(direction);
        scheduleOnRN(tell, direction);
      }
    },
    // Not a swipe (too short, or another gesture took over): back to its place.
    onFinalize: () => {
      'worklet';
      if (gone.get()) return;
      x.set(withSpring(0, BACK));
      y.set(withSpring(0, BACK));
      lead.set(withTiming(0, { duration: 150 }));
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${(x.get() / 200) * TILT}deg` }],
  }));
  const label = (direction: Direction) => {
    'worklet';
    if (gone.get()) return gone.get() === GONE[direction] ? 1 : 0;
    return labelStrength(x.get(), y.get())[direction];
  };
  const easyStyle = useAnimatedStyle(() => ({ opacity: label('easy') }));
  const hardStyle = useAnimatedStyle(() => ({ opacity: label('hard') }));
  const knownStyle = useAnimatedStyle(() => ({ opacity: label('known') }));

  return { pan, cardStyle, labelStyles: { easy: easyStyle, hard: hardStyle, known: knownStyle }, flyOff, flyFromButton: (direction: Direction) => flyOff(direction, BUTTON_FLY_MS), wasDrag };
}
