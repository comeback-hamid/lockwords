import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';

import { KaiCanvas } from './kai-canvas';
import type { KaiState } from './states';

export type { KaiState } from './states';

type Props = {
  /** Any chat state in the spec. One-shot states (greeting, celebrate, oops…) return by themselves. Left out = idle. */
  state?: KaiState;
  /** Kai is speaking right now (its line is being typed or played): mouth moves, body bounces, sound flies out. */
  talking?: boolean;
  /** The learner is typing or speaking right now: Kai leans in with its ears up. */
  listening?: boolean;
  /** Change it to play the same state again (O2: tap Kai, it waves again). */
  playKey?: number;
  /** 0 to 1 while `making`. Leave it out for the spec's fake progress. */
  progress?: number;
  /** Width in points. Height follows the spec's view box. */
  size?: number;
  onPress?: () => void;
};

// Live Kai, drawn with Skia from src/kai/character-spec.json. Use this everywhere Kai shows in the app.
export function Kai({ state = 'idle', talking = false, listening = false, playKey = 0, progress, size = 150, onPress }: Props) {
  const still = useReduceMotion();
  const canvas = <KaiCanvas state={liveState(state, talking, listening)} playKey={playKey} progress={progress} still={still} width={size} />;
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Kai" onPress={onPress}>
        {canvas}
      </Pressable>
    );
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Kai">
      {canvas}
    </View>
  );
}

// Talking and listening show over a resting state only. A state that says something itself
// (thinking, making, celebrate, oops, a wave…) is never cut off. Talking wins over listening.
const RESTING: readonly KaiState[] = ['idle', 'waiting', 'sleeping'];
export function liveState(state: KaiState, talking: boolean, listening: boolean): KaiState {
  if (!RESTING.includes(state)) return state;
  return talking ? 'speaking' : listening ? 'listening' : state;
}

function useReduceMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setOn(v), () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}
