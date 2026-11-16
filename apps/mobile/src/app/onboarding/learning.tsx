import { useRouter } from 'expo-router';

import { LanguageScreen } from '@/onboarding/language-screen';
import { getAnswers, setAnswers } from '@/onboarding/store';

const LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
];

// O1 I'm learning (+ O1b Other).
export default function LearningScreen() {
  const router = useRouter();
  return (
    <LanguageScreen
      title="What do you want to learn?"
      languages={LANGUAGES}
      back={false}
      initial={getAnswers().learning}
      onContinue={(learning) => {
        // A new language means the old word test and estimate no longer fit.
        setAnswers({ learning, wordTest: null, known: [[], [], []], estimate: null });
        router.push('/onboarding/speaks');
      }}
    />
  );
}
