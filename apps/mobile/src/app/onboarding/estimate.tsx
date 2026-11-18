import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import type { Estimate } from '@/api/client';
import { api } from '@/auth/boot';
import { LoadError, Loading } from '@/components/load-state';
import { QuestionScreen } from '@/components/question-screen';
import { useLoad } from '@/components/use-load';
import { languageValue, stepFor } from '@/onboarding/flow';
import { getAnswers, setAnswers } from '@/onboarding/store';
import { colors, radius, space, type } from '@/theme/theme';

const COUNT_MS = 1500;
const fmt = (n: number) => n.toLocaleString('en-US');

// O7 Your estimate (docs/vocab-engine.md 1.5–1.6), with the "Try again" screen for guessers first.
export default function EstimateScreen() {
  const router = useRouter();
  const language = getAnswers().learning;
  const load = useCallback(() => {
    const { learning, known } = getAnswers();
    return api.fetchEstimate(learning ? languageValue(learning) : '', known);
  }, []);
  const { data: estimate, failed, retry } = useLoad<Estimate>(load);
  const [showAnyway, setShowAnyway] = useState(false);
  // Many made-up words ticked: offer a redo once. A second unreliable try just shows the number.
  const askRedo = !!estimate && !estimate.reliable && !getAnswers().retried && !showAnyway;

  if (askRedo) {
    return (
      <QuestionScreen
        step={stepFor('estimate')}
        title="Were you guessing?"
        button={{
          label: 'Try again',
          onPress: () => {
            setAnswers({ known: { A: [], B: [] }, retried: true });
            router.dismissTo('/onboarding/word-test?page=A');
          },
        }}
        link={{ label: 'Show my result', onPress: () => setShowAnyway(true) }}>
        <Text style={[type.body, styles.muted]}>
          {`You tapped ${estimate.fakesTicked} made-up words. Only tap words you know the meaning of, and your number will be right.`}
        </Text>
      </QuestionScreen>
    );
  }

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
        {/* Kai's pose image; the animated Kai comes with the kai-character change. */}
        <Image source={require('../../../assets/kai/kai-celebrate.svg')} style={styles.kai} contentFit="contain" accessibilityLabel="Kai" />
        {failed ? (
          <LoadError message="Could not count your words." onRetry={retry} />
        ) : !estimate ? (
          <Loading label="Counting…" />
        ) : estimate.startingFresh ? (
          <>
            <Text accessibilityRole="header" style={[type.title, styles.ink, styles.center]}>
              You’re starting fresh
            </Text>
            <Text style={[type.body, styles.muted, styles.center]}>{`We’ll start with the first, most useful ${language?.name ?? ''} words.`}</Text>
          </>
        ) : (
          <>
            <Text style={[type.label, styles.muted]}>YOU ALREADY KNOW</Text>
            <View style={styles.numberRow}>
              {estimate.plus ? null : <Text style={[type.title, styles.muted]}>≈</Text>}
              <CountUp to={estimate.words} plus={estimate.plus} />
            </View>
            <Text style={[type.body, styles.muted, styles.center]}>{`of the ${fmt(estimate.outOf)} most common\n${language?.name ?? ''} words`}</Text>
            <View style={styles.pill}>
              <Text style={[type.badge, styles.pillText]}>{`About level ${estimate.cefr}`}</Text>
            </View>
            {estimate.fakesTicked > 0 ? (
              <Text style={[type.caption, styles.muted, styles.center]}>Some words you tapped were made up, so we lowered the number a little.</Text>
            ) : null}
            <Text style={[type.caption, styles.muted, styles.center]}>An estimate from your word test.</Text>
          </>
        )}
      </View>
    </QuestionScreen>
  );
}

// The number counts up from 0 in about 1.5 s (engine 1.6).
function CountUp({ to, plus }: { to: number; plus: boolean }) {
  const [value] = useState(() => new Animated.Value(0));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = value.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(value, { toValue: to, duration: COUNT_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => setShown(to));
    return () => {
      value.removeListener(id);
      value.stopAnimation();
    };
  }, [to, value]);
  const done = shown === to;
  // Rounded steps while counting, the real number at the end.
  const text = done ? `${fmt(to)}${plus ? '+' : ''}` : fmt(Math.round(shown / 10) * 10);
  return (
    <Text accessibilityLabel={`${fmt(to)}${plus ? '+' : ''}`} style={[type.display, styles.ink]}>
      {text}
    </Text>
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
