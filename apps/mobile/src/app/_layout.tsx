import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { syncLockWord } from '@/widgets/sync-lock-word';

export default function RootLayout() {
  useEffect(() => {
    // SPIKE: push the server word to the lock-screen widget on app start.
    syncLockWord().catch((e) => console.warn(e));
  }, []);
  return <Stack screenOptions={{ headerShown: false }} />;
}
