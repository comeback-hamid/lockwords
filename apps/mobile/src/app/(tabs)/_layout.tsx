import { Redirect, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { NativeTabs } from 'expo-router/native-tabs';

import { useOnboardingFinished } from '@/onboarding/finished';
import { startRoute } from '@/onboarding/flow';
import { clearReviewDot, useReviewDot } from '@/review/dot';
import { colors } from '@/theme/theme';

export default function TabsLayout() {
  // The tabs are the start route. Until onboarding is finished they send the user to O1.
  const finished = useOnboardingFinished();
  // The red dot on Review: a deck was just made (New words). It goes away when the learner opens the Review tab.
  const dot = useReviewDot();
  const onReview = usePathname() === '/review';
  useEffect(() => {
    if (onReview && dot) void clearReviewDot();
  }, [onReview, dot]);
  if (finished === null) return null; // read at start by the root layout; the splash screen still covers this
  if (!finished) return <Redirect href={startRoute(false)} />;
  return (
    // Figma Tab bar: Icon/24 glyphs exported from Figma (assets/tabs), muted when idle and green when selected.
    // Android (Material tab bar): the pill behind the chosen icon is our light green, not the system's purple.
    <NativeTabs backgroundColor={colors.surface} labelStyle={{ selected: { color: colors.text } }} iconColor={{ default: colors.muted, selected: colors.button }} indicatorColor={colors.greenBg} rippleColor={colors.greenBg}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>New words</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('../../../assets/tabs/new-words.png')} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Label>Review</NativeTabs.Trigger.Label>
        {/* The red dot is part of the icon picture (assets/tabs/review-dot*.png, a small dot on the muted icon):
            the system badge is bigger and its size cannot be changed (Hamid, 2026-11-24). It shows only while the
            tab is not selected, so the picture keeps its own colors. */}
        {dot && !onReview ? (
          <NativeTabs.Trigger.Icon src={require('../../../assets/tabs/review-dot.png')} renderingMode="original" />
        ) : (
          <NativeTabs.Trigger.Icon src={require('../../../assets/tabs/review.png')} renderingMode="template" />
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={require('../../../assets/tabs/progress.png')} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
