import { useRouter } from 'expo-router';

import { LanguageScreen } from '@/onboarding/language-screen';
import { getAnswers, setAnswers } from '@/onboarding/store';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fa', name: 'Persian' },
  { code: 'ar', name: 'Arabic' },
];

// O1c I speak.
export default function SpeaksScreen() {
  const router = useRouter();
  return (
    <LanguageScreen
      title="What language do you speak?"
      languages={LANGUAGES}
      back
      initial={getAnswers().speaks}
      onContinue={(speaks) => {
        setAnswers({ speaks });
        router.push('/onboarding/welcome');
      }}
    />
  );
}
