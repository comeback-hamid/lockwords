import * as Speech from 'expo-speech';

import { sayWord, warmUpSpeech } from '@/review/speak';
import { saveSpeechLanguage } from '@/review/speech-language';

// Hamid's iPhone, 2026-11-25: the first tap on the speaker started late and with a hiccup (iOS loads the voice then).
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(async () => {}) }));
const speak = jest.mocked(Speech.speak);

test('the voice is loaded once per language, with no sound', async () => {
  await saveSpeechLanguage('es');
  warmUpSpeech();
  warmUpSpeech();
  expect(speak).toHaveBeenCalledTimes(1);
  expect(speak).toHaveBeenLastCalledWith('a', expect.objectContaining({ language: 'es', volume: 0 }));
  await saveSpeechLanguage('fr');
  warmUpSpeech();
  expect(speak).toHaveBeenCalledTimes(2);
});

test('a word is stopped only while one is being said', () => {
  speak.mockClear();
  sayWord('hola');
  expect(Speech.stop).not.toHaveBeenCalled(); // quiet phone: no stop, so the start does not stumble
  speak.mock.calls[0]![1]!.onStart!();
  sayWord('adiós');
  expect(Speech.stop).toHaveBeenCalledTimes(1);
});
