import { useRouter } from 'expo-router';
import { useState } from 'react';

import type { Profile } from '@/api/client';
import { LevelMark, OptionBox } from '@/components/option-box';
import { QuestionScreen } from '@/components/question-screen';
import { afterLevel, stepFor } from '@/onboarding/flow';
import { getAnswers, setAnswers } from '@/onboarding/store';

const LEVELS: { value: Profile['level']; label: string; description: string; n: 0 | 1 | 2 | 3 | 4 }[] = [
  { value: 'brand_new', label: 'Brand new', description: 'I don’t know any words yet', n: 0 },
  { value: 'beginner', label: 'Beginner', description: 'A few words', n: 1 },
  { value: 'some_basics', label: 'Some basics', description: 'I can order food', n: 2 },
  { value: 'intermediate', label: 'Intermediate', description: 'I can chat', n: 3 },
  { value: 'advanced', label: 'Advanced', description: 'I can follow the news', n: 4 },
];

// O3 Level.
export default function LevelScreen() {
  const router = useRouter();
  const [level, setLevel] = useState(getAnswers().level);
  return (
    <QuestionScreen
      step={stepFor('level')}
      title={`Your ${getAnswers().learning?.name ?? ''} level`}
      button={{
        label: 'Continue',
        disabled: !level,
        onPress: () => {
          if (!level) return;
          // Brand new skips the test, so old test answers must not leak into the profile.
          setAnswers(level === 'brand_new' ? { level, known: [[], [], []], estimate: null } : { level });
          router.push(afterLevel(level));
        },
      }}>
      <OptionBox<Profile['level']> value={level} onChange={setLevel} options={LEVELS.map((l) => ({ ...l, leading: <LevelMark n={l.n} /> }))} />
    </QuestionScreen>
  );
}
