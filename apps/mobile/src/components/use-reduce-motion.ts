import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// True when the phone asks for less motion: animated pictures stand still.
export function useReduceMotion() {
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
