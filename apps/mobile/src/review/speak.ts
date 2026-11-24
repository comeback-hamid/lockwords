import * as Speech from 'expo-speech';

import { getSpeechLanguage } from '@/review/speech-language';

// Says a word in the language being learned. The one place that speaks, for every speaker button.
// `useApplicationAudioSession: false`: iOS speaks through its own speech session, so the word is heard with the
// ring switch on silent too (with the app's session the phone stayed quiet; Hamid's iPhone, 2026-11-24).
export function sayWord(word: string) {
  void Speech.stop();
  Speech.speak(word, { language: getSpeechLanguage(), useApplicationAudioSession: false });
}
