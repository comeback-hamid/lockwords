import { Redirect, Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useOnboardingFinished } from '@/onboarding/finished';
import { startRoute } from '@/onboarding/flow';
import { WebTabBar } from '@/platform/web-tab-bar';
import { clearReviewDot, useReviewDot } from '@/review/dot';

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
  if (finished === null) return null;
  if (!finished) return <Redirect href={startRoute(false)} />;
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => <WebTabBar state={state} dot={dot && !onReview} onOpen={navigateToTab} />}>
      <Tabs.Screen name="index" options={{ title: 'New words' }} />
      <Tabs.Screen name="review" options={{ title: 'Review' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}
