import { fireEvent, render, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';

import type { ReviewCard } from '@/api/client';
import RoundScreen from '@/app/review/round';
import { SECURE_KEYS } from '@/auth/session-storage';
import { setRound } from '@/review/round-store';
import { loadSpeechLanguage, saveSpeechLanguage } from '@/review/speech-language';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/auth/boot', () => ({ api: {} }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const card: ReviewCard = { id: 'c1', deckId: 'd1', deckTopic: 'Ordering food', word: 'la propina', translation: 'the tip', example: 'e', exampleTranslation: 't', stage: 0, canUseIt: true };
const say = async () => {
  setRound([card]);
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Say the word' }));
};

test('the speaker uses the learning language, also after a restart', async () => {
  await saveSpeechLanguage('es');
  expect(SECURE_KEYS).toContain('lockwords.learning'); // so a fresh install clears it
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('lockwords.learning', 'es');
  await say();
  expect(Speech.speak).toHaveBeenLastCalledWith('la propina', expect.objectContaining({ language: 'es', useApplicationAudioSession: false }));
  // "Restart": the app reads the saved value at start.
  mockStore.set('lockwords.learning', 'fr');
  await loadSpeechLanguage();
  await fireEvent.press(screen.getByRole('button', { name: 'Say the word' }));
  expect(Speech.speak).toHaveBeenLastCalledWith('la propina', expect.objectContaining({ language: 'fr', useApplicationAudioSession: false }));
});

test('a typed-in language (no code) falls back to the phone voice', async () => {
  await saveSpeechLanguage(null);
  await say();
  expect(Speech.speak).toHaveBeenLastCalledWith('la propina', expect.objectContaining({ language: undefined, useApplicationAudioSession: false }));
});
