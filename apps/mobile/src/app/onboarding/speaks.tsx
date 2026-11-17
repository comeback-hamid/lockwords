import { useRouter } from 'expo-router';

import { LanguageScreen } from '@/onboarding/language-screen';
import { getAnswers, setAnswers, type LanguageChoice } from '@/onboarding/store';

// Same language = same code, or the same typed name.
const same = (a: LanguageChoice, b: LanguageChoice) => (a.code && b.code ? a.code === b.code : !a.code && !b.code && a.name.trim().toLowerCase() === b.name.trim().toLowerCase());

// O1c I speak. The language being learned is blocked.
export default function SpeaksScreen() {
  const router = useRouter();
  const learning = getAnswers().learning;
  return (
    <LanguageScreen
      title="What language do you speak?"
      back
      initial={getAnswers().speaks}
      blocked={(choice) => (learning && same(choice, learning) ? `You're learning ${learning.name}. Pick the language you already speak.` : null)}
      onContinue={(speaks) => {
        setAnswers({ speaks });
        router.push('/onboarding/welcome');
      }}
    />
  );
}
