import { Redirect, Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useOnboardingFinished } from '@/onboarding/finished';
import { startRoute } from '@/onboarding/flow';
import { contentWidth, WEB, webMode } from '@/platform/web-layout';
import { WebTabBar } from '@/platform/web-tab-bar';
import { clearReviewDot, useReviewDot } from '@/review/dot';
import { colors } from '@/theme/theme';

// The tabs in a browser. The phone uses the system tab bar (_layout.tsx); a browser has none, so the web app draws
// its own (`WebTabBar`: the same three tabs, icons and colors, Figma Tab bar). Same rules: onboarding first, and the
// red dot on Review until the learner opens it.
export default function TabsLayout() {
  const finished = useOnboardingFinished();
  const dot = useReviewDot();
  const onReview = usePathname() === '/review';
  useEffect(() => {
    if (onReview && dot) void clearReviewDot();
  }, [onReview, dot]);
  const { width } = useWindowDimensions();
  if (finished === null) return null;
  if (!finished) return <Redirect href={startRoute(false)} />;
  // A wide window: the tabs are a side bar on the left and each screen is a centered column (`web-layout`).
  const mode = webMode(width);
  const side = mode === 'desktop';
  const column = contentWidth(width);
  const room = width - (side ? WEB.rail : 0);
  const gutter = Math.max(0, (room - column) / 2);
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarPosition: side ? 'left' : 'bottom', sceneStyle: [styles.scene, { paddingHorizontal: gutter }] }}
      tabBar={({ state, navigateToTab }) => (
        <View style={side ? styles.sideSlot : { paddingHorizontal: gutter, backgroundColor: colors.surface }}>
          <WebTabBar state={state} dot={dot && !onReview} onOpen={navigateToTab} side={side} />
        </View>
      )}>
      <Tabs.Screen name="index" options={{ title: 'New words' }} />
      {/* The word card keeps a card's shape: Review gets the narrower column. */}
      <Tabs.Screen name="review" options={{ title: 'Review', sceneStyle: [styles.scene, { paddingHorizontal: Math.max(0, (room - contentWidth(width, true)) / 2) }] }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: { backgroundColor: colors.canvas },
  sideSlot: { height: '100%' },
});
