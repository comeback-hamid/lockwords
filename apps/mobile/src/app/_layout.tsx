import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { bootSession } from '@/auth/boot';
import { clearOnFreshInstall } from '@/auth/session-storage';
import { loadOnboardingFinished, useOnboardingFinished } from '@/onboarding/finished';
import { loadSpeechLanguage } from '@/review/speech-language';
import { fonts } from '@/theme/fonts';
import { colors } from '@/theme/theme';

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
      .then(bootSession); // silent guest sign-in; the screens never wait for it
  }, []);

  if (!ready) return null;
  const stack = <Stack screenOptions={{ headerShown: false }} />;
  if (Platform.OS !== 'web') return stack;
  // In a browser the app keeps its phone shape: one column in the middle of the page (Figma frame: 393 wide).
  return (
    <View style={styles.page}>
      <View style={styles.phone}>{stack}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: colors.divider },
  phone: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.canvas, overflow: 'hidden' },
});
