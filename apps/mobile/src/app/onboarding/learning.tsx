import { useRouter } from 'expo-router';

import { LanguageScreen } from '@/onboarding/language-screen';
import { getAnswers, setAnswers } from '@/onboarding/store';

// O1 I'm learning (+ O1b Other).
export default function LearningScreen() {
  const router = useRouter();
  return (
    <LanguageScreen
      title="What do you want to learn?"
      back={false}
      initial={getAnswers().learning}
      onContinue={(learning) => {
        // A new language means the old word test and estimate no longer fit.
        setAnswers({ learning, wordTest: null, known: { A: [], B: [] }, estimate: null, retried: false });
        router.push('/onboarding/speaks');
      }}
    />
  );
}
