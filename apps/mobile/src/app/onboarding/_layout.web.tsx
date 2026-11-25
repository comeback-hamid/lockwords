import { Redirect, Stack, usePathname } from 'expo-router';

import { useOnboardingFinished } from '@/onboarding/finished';
import { useAnswers } from '@/onboarding/store';
import { lostAnswers, restartRoute } from '@/platform/onboarding-reload';

// Onboarding in a browser. Same as the phone's layout, plus one rule: a reload in the middle of onboarding has lost
// the answers, so it starts onboarding again from Hello (on the phone a restart does the same). A learner who finished onboarding
// before gets the app instead.
export default function OnboardingLayout() {
  const pathname = usePathname();
  const { learning } = useAnswers();
  const finished = useOnboardingFinished();
  if (lostAnswers(pathname, learning !== null)) return <Redirect href={restartRoute(finished)} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
