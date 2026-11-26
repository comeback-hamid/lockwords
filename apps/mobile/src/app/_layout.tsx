import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { bootSession } from '@/auth/boot';
import { clearOnFreshInstall } from '@/auth/session-storage';
import { loadOnboardingFinished, useOnboardingFinished } from '@/onboarding/finished';
import { installPageStyle } from '@/platform/page-style';
import { WebFrame } from '@/platform/web-frame';
import { loadSpeechLanguage } from '@/review/speech-language';
import { fonts } from '@/theme/fonts';
import { startWidgetSync } from '@/widgets/sync';
import { firstFromUrl, tapped } from '@/widgets/tapped';

SplashScreen.preventAutoHideAsync();
installPageStyle(); // the browser only

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
      .then(bootSession) // silent guest sign-in; the screens never wait for it
      .then(() => (stopWidgetSync = startWidgetSync())); // the widget gets its hard words when the app opens or comes back
    let stopWidgetSync = () => {};
    return () => stopWidgetSync();
  }, []);

  // A tap on the widget opens `lockwords://review?first=<id>`: the router shows the Review tab, and the tab reads the id.
  useEffect(() => {
    const note = (url: string | null) => {
      const first = firstFromUrl(url);
      if (first) tapped.set(first);
    };
    void Linking.getInitialURL().then(note, () => {});
    const sub = Linking.addEventListener('url', (e) => note(e.url));
    return () => sub.remove();
  }, []);

  if (!ready) return null;
  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The tabs are the bottom of the app. With the iOS swipe-back on, a swipe to the right from the screen edge
          (the Easy swipe on a review card) left the tabs for whatever screen was open before them. */}
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
    </Stack>
  );
  // Android draws the app under the status bar and picks white icons by itself: the app is always light, so ask for dark ones.
  if (Platform.OS !== 'web')
    return (
      <>
        {stack}
        <StatusBar style="dark" />
      </>
    );
  // In a browser the page lays the app out for the window (phone, tablet, desktop): `WebFrame`.
  return <WebFrame>{stack}</WebFrame>;
}
