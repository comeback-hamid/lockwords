import * as Speech from 'expo-speech';

import { getSpeechLanguage } from '@/review/speech-language';

// `useApplicationAudioSession: false`: iOS speaks through its own speech session, so the word is heard with the
// ring switch on silent too (with the app's session the phone stayed quiet; Hamid's iPhone, 2026-11-24).
const options = () => ({ language: getSpeechLanguage(), useApplicationAudioSession: false });

let speaking = false;
let warmFor: string | null = null;

// The first word a phone says in a language starts late and with a hiccup: iOS loads the voice then
// (Hamid's iPhone, 2026-11-25). So the voice is loaded before the learner needs it: one letter with no sound,
// when a round's first card or a word card shows (not at app start: it would lower the learner's music for a moment
// each time the app opens). Once per language.
export function warmUpSpeech() {
  const language = getSpeechLanguage() ?? '';
  if (warmFor === language) return;
  warmFor = language;
  Speech.speak('a', { ...options(), volume: 0 });
}

// Says a word in the language being learned. The one place that speaks, for every speaker button.
// A word that is still being said is cut off by the next one; nothing is stopped when the phone is quiet
// (a stop right before a word makes its start stumble).
export function sayWord(word: string) {
  if (speaking) void Speech.stop();
  const done = () => void (speaking = false);
  Speech.speak(word, { ...options(), onStart: () => void (speaking = true), onDone: done, onStopped: done, onError: done });
}
