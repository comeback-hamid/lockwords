import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/auth/boot';
import { Icon } from '@/components/icon';
import { LoadError, Loading } from '@/components/load-state';
import { QuestionScreen } from '@/components/question-screen';
import { useLoad } from '@/components/use-load';
import { languageValue, stepFor } from '@/onboarding/flow';
import { getAnswers, setAnswers, useAnswers } from '@/onboarding/store';
import { colors, levelColors, radius, space, type } from '@/theme/theme';

// O4–O6 Word test. One screen per band (?band=0..2).
export default function WordTestScreen() {
  const router = useRouter();
  const band = Number(useLocalSearchParams<{ band?: string }>().band ?? 0) as 0 | 1 | 2;
  const { wordTest, known } = useAnswers();
  // Loaded once (on the first band) and kept in the answers store for the next two screens.
  const load = useCallback(async () => {
    const { learning } = getAnswers();
    const test = await api.fetchWordTest(learning ? languageValue(learning) : '');
    if (test.supported) setAnswers({ wordTest: test });
    else router.replace('/onboarding/goal'); // no test for this language yet
  }, [router]);
  const { failed, retry } = useLoad(load, wordTest !== null);

  const words = wordTest?.bands[band]?.words ?? [];
  const selected = known[band];
  const setSelected = (next: string[]) => setAnswers({ known: known.map((k, i) => (i === band ? next : k)) as typeof known });
  const next = () => router.push(band < 2 ? `/onboarding/word-test?band=${band + 1}` : '/onboarding/estimate');

  return (
    <QuestionScreen
      step={stepFor('word-test', band)}
      title="Tap the words you know"
      button={{ label: 'Continue', disabled: !wordTest, onPress: next }}
      link={
        wordTest
          ? {
              label: 'I don’t know any of these',
              onPress: () => {
                setSelected([]);
                next();
              },
            }
          : undefined
      }>
      {failed ? (
        <LoadError message="Could not load the words." onRetry={retry} />
      ) : !wordTest ? (
        <Loading label="Loading words…" />
      ) : (
        <View style={styles.group}>
          <View style={styles.meta}>
            <Text style={[type.label, styles.muted]}>{`${wordTest.bands[band]?.level.toUpperCase()} · ${band + 1} OF 3`}</Text>
            <Text style={[type.label, styles.count]}>{`${selected.length} SELECTED`}</Text>
          </View>
          <View style={styles.chips}>
            {words.map((word) => {
              const on = selected.includes(word);
              return (
                <Pressable
                  key={word}
                  accessibilityRole="checkbox"
                  accessibilityLabel={word}
                  accessibilityState={{ checked: on }}
                  onPress={() => setSelected(on ? selected.filter((w) => w !== word) : [...selected, word])}
                  style={[styles.chip, on && styles.chipOn]}>
                  {on ? <Icon name="check" color={colors.greenText} /> : null}
                  <Text style={[type.callout, { color: on ? colors.greenText : colors.text }]}>{word}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </QuestionScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[12], marginTop: -space[8] },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: colors.muted },
  count: { color: colors.greenText },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  chip: { height: 44, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[16], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipOn: { borderColor: levelColors[3], backgroundColor: colors.greenBg },
});
