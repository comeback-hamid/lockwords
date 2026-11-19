import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { bootSession } from '@/auth/boot';
import { clearOnFreshInstall } from '@/auth/session-storage';
import { loadOnboardingFinished, useOnboardingFinished } from '@/onboarding/finished';
import { loadReviewDot } from '@/review/dot';
import { loadSpeechLanguage } from '@/review/speech-language';
import { fonts } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fonts);
  // On a font error we still open the app (system font) instead of a stuck splash screen.
  // Web is server-rendered: waiting here would break hydration, and the browser swaps fonts in by itself.
  const onboardingKnown = useOnboardingFinished() !== null;
  const ready = (Platform.OS === 'web' || loaded || error !== null) && onboardingKnown;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    // Order matters: clear a deleted install's keychain first, then read the onboarding flag, then sign in.
    clearOnFreshInstall()
      .catch(() => {})
      .then(loadOnboardingFinished)
      .then(loadSpeechLanguage)
      .then(loadReviewDot)
      .then(bootSession); // silent guest sign-in; the screens never wait for it
  }, []);

  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
