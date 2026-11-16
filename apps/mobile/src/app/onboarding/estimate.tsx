import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Estimate } from '@/api/client';
import { api } from '@/auth/boot';
import { LoadError, Loading } from '@/components/load-state';
import { QuestionScreen } from '@/components/question-screen';
import { useLoad } from '@/components/use-load';
import { languageValue, stepFor } from '@/onboarding/flow';
import { getAnswers, setAnswers } from '@/onboarding/store';
import { colors, radius, space, type } from '@/theme/theme';

// O7 Your estimate (number only).
export default function EstimateScreen() {
  const router = useRouter();
  const language = getAnswers().learning;
  const load = useCallback(() => {
    const { learning, known } = getAnswers();
    return api.fetchEstimate(learning ? languageValue(learning) : '', known.flat());
  }, []);
  const { data: estimate, failed, retry } = useLoad<Estimate>(load);

  return (
    <QuestionScreen
      step={stepFor('estimate')}
      button={{
        label: 'Continue',
        disabled: !estimate,
        onPress: () => {
          setAnswers({ estimate });
          router.push('/onboarding/goal');
        },
      }}>
      <View style={styles.header}>
        <Image source={require('../../../assets/kai/kai-celebrate.svg')} style={styles.kai} contentFit="contain" accessibilityLabel="Kai" />
        {failed ? (
          <LoadError message="Could not count your words." onRetry={retry} />
        ) : !estimate ? (
          <Loading label="Counting…" />
        ) : (
          <>
            <Text style={[type.label, styles.muted]}>YOU ALREADY KNOW</Text>
            <View style={styles.numberRow}>
              <Text style={[type.title, styles.muted]}>≈</Text>
              <Text style={[type.display, styles.ink]}>{estimate.knownWords.toLocaleString('en-US')}</Text>
            </View>
            <Text style={[type.body, styles.muted, styles.center]}>{`of the ${estimate.outOf.toLocaleString('en-US')} most common\n${language?.name ?? ''} words`}</Text>
            <View style={styles.pill}>
              <Text style={[type.badge, styles.pillText]}>{estimate.cefr}</Text>
            </View>
          </>
        )}
      </View>
    </QuestionScreen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: space[12] },
  kai: { width: 152, height: 104, marginBottom: space[16] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  center: { textAlign: 'center' },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  pill: { paddingHorizontal: space[8], height: 24, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.greenBg },
  pillText: { color: colors.greenText },
});
