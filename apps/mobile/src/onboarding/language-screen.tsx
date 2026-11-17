import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { LanguageCheck } from '@/api/client';
import { api } from '@/auth/boot';
import { Icon } from '@/components/icon';
import { CodeBadge, OptionBox } from '@/components/option-box';
import { QuestionScreen } from '@/components/question-screen';
import { TextField } from '@/components/text-field';
import { colors, layout, radius, space, type } from '@/theme/theme';

import { LANGUAGES } from './languages';
import type { LanguageChoice } from './store';

type Props = {
  title: string;
  back: boolean;
  initial: LanguageChoice | null;
  // A line that blocks this choice (O1c: the language being learned), or null.
  blocked?(choice: LanguageChoice): string | null;
  onContinue(choice: LanguageChoice): void;
};

const NOT_RECOGNISED = "We didn't recognise this language. Please check the spelling or pick one from the list.";

// A checked language: a listed one keeps its code; any other keeps only the server's English name.
const toChoice = (l: NonNullable<LanguageCheck['language']>): LanguageChoice => (l.listed ? { code: l.code, name: l.name } : { code: null, name: l.name });

// O1 "I'm learning", O1b (Other text box) and O1c "I speak" are the same screen. A typed language is checked by the server.
export function LanguageScreen({ title, back, initial, blocked, onContinue }: Props) {
  const [picked, setPicked] = useState<string | null>(initial ? (initial.code ?? 'other') : null);
  const [other, setOther] = useState(initial && !initial.code ? initial.name : '');
  const [checking, setChecking] = useState(false);
  const [suggestion, setSuggestion] = useState<LanguageChoice | null>(null);
  const [blockLine, setBlockLine] = useState<string | null>(null);

  const listed = LANGUAGES.find((l) => l.code === picked);
  const typed = picked === 'other' ? other.trim() : '';
  const line = listed ? (blocked?.(listed) ?? null) : blockLine;

  const pick = (value: string) => {
    setPicked(value);
    setSuggestion(null);
    setBlockLine(null);
  };
  const edit = (text: string) => {
    setOther(text);
    setSuggestion(null);
    setBlockLine(null);
  };
  // Goes on unless the choice is blocked; a blocked one shows its line.
  const finish = (choice: LanguageChoice) => {
    const stop = blocked?.(choice) ?? null;
    setSuggestion(null);
    if (stop) setBlockLine(stop);
    else onContinue(choice);
  };

  async function check() {
    setChecking(true);
    let answer: LanguageCheck | null = null;
    try {
      answer = await api.checkLanguage(typed);
    } catch {
      // No network or AI: never stop onboarding. Keep the text as typed.
    }
    setChecking(false);
    if (!answer) return finish({ code: null, name: typed });
    if (answer.result === 'unknown' || !answer.language) return Alert.alert('Language not recognised', NOT_RECOGNISED, [{ text: 'OK' }]);
    if (answer.result === 'suggestion') return setSuggestion(toChoice(answer.language));
    finish(toChoice(answer.language));
  }

  const ready = listed ? !line : typed.length > 0;
  const onPress = () => {
    if (listed) finish(listed);
    else if (typed) void check();
  };

  return (
    <QuestionScreen
      step={1}
      back={back}
      title={title}
      message={line ?? undefined}
      button={{ label: checking ? 'Checking…' : 'Continue', disabled: !ready || checking, onPress }}>
      <View style={{ gap: space[8] }}>
        <OptionBox
          value={picked}
          onChange={pick}
          options={[
            ...LANGUAGES.map((l) => ({ value: l.code, label: l.name, leading: (selected: boolean) => <CodeBadge code={l.code} selected={selected} /> })),
            { value: 'other', label: 'Other', leading: (selected: boolean) => <Icon name="pencil" color={selected ? colors.greenText : colors.text2} /> },
          ]}
        />
        {picked === 'other' ? <TextField label={title} accessibilityLabel="Language name" value={other} onChangeText={edit} /> : null}
        {suggestion ? (
          <View style={styles.suggestion}>
            <Text style={[type.bodyStrong, styles.suggestionText]}>{`Did you mean ${suggestion.name}?`}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Yes, ${suggestion.name}`} onPress={() => finish(suggestion)} style={styles.yes}>
              <Text style={[type.button, styles.suggestionText]}>{`Yes, ${suggestion.name}`}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </QuestionScreen>
  );
}

const styles = StyleSheet.create({
  suggestion: { gap: space[12], padding: space[16], borderRadius: radius.control, backgroundColor: colors.greenBg },
  suggestionText: { color: colors.greenText },
  // Not a second primary button (one per screen): a white control with a green edge.
  yes: { height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, borderWidth: 1, borderColor: colors.button, backgroundColor: colors.surface },
});
