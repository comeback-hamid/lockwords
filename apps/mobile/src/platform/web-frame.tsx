import { useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/theme/theme';

import { WEB, webMode } from './web-layout';

// The page around the app in a browser. The tabs lay themselves out (side bar or bottom bar, `(tabs)/_layout.web.tsx`).
// Every other screen (onboarding, Use it, a deck, the first round) is one calm column in the middle of a wide window.
export function WebFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const inTabs = (useSegments() as string[])[0] === '(tabs)';
  const mode = webMode(width);
  if (mode === 'phone' || inTabs) return <View style={styles.page}>{children}</View>;
  return (
    <View style={[styles.page, styles.center]}>
      <View style={styles.focus}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  center: { alignItems: 'center' },
  focus: { flex: 1, width: '100%', maxWidth: WEB.focusColumn, overflow: 'hidden' },
});
