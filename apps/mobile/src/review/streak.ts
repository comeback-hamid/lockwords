import * as SecureStore from 'expo-secure-store';

import { api } from '@/auth/boot';

// The streak card (Figma A7) shows once per review day, from a streak of 2 days.
const KEY = 'lockwords.streakShown'; // the review day it was last shown; listed in SECURE_KEYS, so a fresh install clears it
const MIN_STREAK = 2;

// The streak to show now, or null (too short, shown today already, or the server could not be reached).
// Asking marks today as shown.
export async function streakToShow(): Promise<number | null> {
  try {
    const { day, streakDays } = await api.fetchSummary();
    if (streakDays < MIN_STREAK) return null;
    if ((await SecureStore.getItemAsync(KEY)) === day) return null;
    await SecureStore.setItemAsync(KEY, day);
    return streakDays;
  } catch {
    return null;
  }
}
