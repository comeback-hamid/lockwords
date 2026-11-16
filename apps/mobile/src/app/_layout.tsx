import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { fonts } from '@/theme/fonts';
import { syncLockWord } from '@/widgets/sync-lock-word';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fonts);
  // On a font error we still open the app (system font) instead of a stuck splash screen.
  // Web is server-rendered: waiting here would break hydration, and the browser swaps fonts in by itself.
  const ready = Platform.OS === 'web' || loaded || error !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    // SPIKE: push the server word to the lock-screen widget on app start.
    syncLockWord().catch((e) => console.warn(e));
  }, []);

  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
