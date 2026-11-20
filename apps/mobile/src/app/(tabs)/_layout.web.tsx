import { Image } from 'expo-image';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useOnboardingFinished } from '@/onboarding/finished';
import { startRoute } from '@/onboarding/flow';
import { clearReviewDot, useReviewDot } from '@/review/dot';
import { colors, type } from '@/theme/theme';

const ICONS = {
  index: require('../../../assets/tabs/new-words.png'),
  review: require('../../../assets/tabs/review.png'),
  progress: require('../../../assets/tabs/progress.png'),
} as const;

// The tabs in a browser. The phone uses the system tab bar (_layout.tsx); a browser has none, so this is a plain
// bar at the bottom with the same three tabs, icons and colors (Figma Tab bar). Same rules: onboarding first, and the
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
  const icon = (name: keyof typeof ICONS, badge = false) =>
    function TabIcon({ focused }: { focused: boolean }) {
      return (
        <View>
          <Image source={ICONS[name]} style={styles.icon} tintColor={focused ? colors.button : colors.muted} contentFit="contain" />
          {badge ? <View accessibilityLabel="New words to review" style={styles.dot} /> : null}
        </View>
      );
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: type.tab,
        tabBarStyle: styles.bar,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'New words', tabBarIcon: icon('index') }} />
      <Tabs.Screen name="review" options={{ title: 'Review', tabBarIcon: icon('review', dot && !onReview) }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('progress') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { height: 64, paddingTop: 6, paddingBottom: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  icon: { width: 24, height: 24 },
  dot: { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.hard },
});
