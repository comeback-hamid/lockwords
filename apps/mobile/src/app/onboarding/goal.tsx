import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { Profile } from '@/api/client';
import { Icon, type IconName } from '@/components/icon';
import { OptionBox } from '@/components/option-box';
import { QuestionScreen } from '@/components/question-screen';
import { TextField } from '@/components/text-field';
import { stepFor } from '@/onboarding/flow';
import { getAnswers, setAnswers } from '@/onboarding/store';
import { colors, space } from '@/theme/theme';

const GOALS: { value: Profile['goal']; label: string; icon: IconName }[] = [
  { value: 'travel', label: 'Travel', icon: 'travel' },
  { value: 'work', label: 'Work', icon: 'work' },
  { value: 'move_abroad', label: 'Move abroad', icon: 'globe' },
  { value: 'family_friends', label: 'Family & friends', icon: 'people' },
  { value: 'brain', label: 'Keep my brain active', icon: 'bulb' },
  { value: 'school', label: 'School', icon: 'school' },
  { value: 'other', label: 'Other', icon: 'pencil' },
];

// O8 Goal. Other opens the "Your reason" box (Figma O8b).
export default function GoalScreen() {
  const router = useRouter();
  const [goal, setGoal] = useState(getAnswers().goal);
  const [other, setOther] = useState(getAnswers().goalOther);
  const ready = goal !== null && (goal !== 'other' || other.trim() !== '');
  return (
    <QuestionScreen
      step={stepFor('goal')}
      title="Why are you learning?"
      button={{
        label: 'Continue',
        disabled: !ready,
        onPress: () => {
          setAnswers({ goal, goalOther: other });
          router.push('/onboarding/interests');
        },
      }}>
      <View style={{ gap: space[16] }}>
        <OptionBox<Profile['goal']>
          value={goal}
          onChange={setGoal}
          options={GOALS.map((g) => ({ ...g, leading: (selected: boolean) => <Icon name={g.icon} color={selected ? colors.greenText : colors.text2} /> }))}
        />
        {goal === 'other' ? <TextField label="Your reason" accessibilityLabel="Your reason" value={other} onChangeText={setOther} maxLength={80} /> : null}
      </View>
    </QuestionScreen>
  );
}
