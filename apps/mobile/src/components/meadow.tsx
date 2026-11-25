import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Scene } from '@/progress/meadow';

import { MeadowCanvas } from './meadow-canvas';
import { useReduceMotion } from './use-reduce-motion';

type Props = {
  scene: Scene; // from src/progress/meadow.ts
  label: string; // what a screen reader says
  testID?: string;
  rich?: boolean; // the big meadow: more falling leaves, and specks of light
  quick?: boolean; // grow in fast
  replay?: string | number; // a new value grows the picture in again
  children?: ReactNode; // drawn over the picture (Kai, in the small meadow)
};

// A pixel meadow (Figma P1). It fills the width it gets; the trees grow in when the screen opens, then move in the wind.
export function Meadow({ scene, label, testID, rich = false, quick = false, replay, children }: Props) {
  const [width, setWidth] = useState(0);
  const still = useReduceMotion();
  return (
    <View testID={testID} style={[styles.root, { aspectRatio: scene.width / scene.height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View accessible accessibilityRole="image" accessibilityLabel={label} style={StyleSheet.absoluteFill}>
        <MeadowCanvas scene={scene} width={width} rich={rich} still={still} quick={quick} replay={replay} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch' },
});
