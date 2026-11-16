import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { CodeBadge, OptionBox } from '@/components/option-box';
import { QuestionScreen } from '@/components/question-screen';
import { TextField } from '@/components/text-field';
import { colors, space } from '@/theme/theme';

import type { LanguageChoice } from './store';

type Props = {
  title: string;
  languages: { code: string; name: string }[];
  back: boolean;
  initial: LanguageChoice | null;
  onContinue(choice: LanguageChoice): void;
};

// O1 "I'm learning", O1b (Other text box) and O1c "I speak" are the same screen with different lists.
export function LanguageScreen({ title, languages, back, initial, onContinue }: Props) {
  const [picked, setPicked] = useState<string | null>(initial ? (initial.code ?? 'other') : null);
  const [other, setOther] = useState(initial && !initial.code ? initial.name : '');

  const listed = languages.find((l) => l.code === picked);
  const choice: LanguageChoice | null = listed ? listed : picked === 'other' && other.trim() ? { code: null, name: other.trim() } : null;

  return (
    <QuestionScreen step={1} back={back} title={title} button={{ label: 'Continue', disabled: !choice, onPress: () => choice && onContinue(choice) }}>
      <View style={{ gap: space[8] }}>
        <OptionBox
          value={picked}
          onChange={setPicked}
          options={[
            ...languages.map((l) => ({ value: l.code, label: l.name, leading: (selected: boolean) => <CodeBadge code={l.code} selected={selected} /> })),
            { value: 'other', label: 'Other', leading: (selected: boolean) => <Icon name="pencil" color={selected ? colors.greenText : colors.text2} /> },
          ]}
        />
        {picked === 'other' ? <TextField label={title} accessibilityLabel="Language name" value={other} onChangeText={setOther} /> : null}
      </View>
    </QuestionScreen>
  );
}
