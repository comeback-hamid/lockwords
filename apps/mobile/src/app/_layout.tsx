import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { bootSession } from '@/auth/boot';
import { fonts } from '@/theme/fonts';

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
    bootSession(); // silent guest sign-in; the tabs never wait for it
  }, []);

  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
