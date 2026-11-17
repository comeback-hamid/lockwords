import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TestPage } from '@/api/client';
import { api } from '@/auth/boot';
import { LoadError, Loading } from '@/components/load-state';
import { QuestionScreen } from '@/components/question-screen';
import { useLoad } from '@/components/use-load';
import { languageValue, stepFor } from '@/onboarding/flow';
import { getAnswers, setAnswers, useAnswers } from '@/onboarding/store';
import { isPage, PAGE_TITLE, PAGES } from '@/onboarding/word-test-pages';
import { colors, levelColors, radius, space, type } from '@/theme/theme';

// O4–O6 Word test, one screen per page (?page=A..D), following docs/vocab-engine.md.
export default function WordTestScreen() {
  const router = useRouter();
  const param = useLocalSearchParams<{ page?: string }>().page;
  const page: TestPage = isPage(param) ? param : 'A';
  const { wordTest, known } = useAnswers();
  const language = () => {
    const { learning } = getAnswers();
    return learning ? languageValue(learning) : '';
  };
  // Loaded once (on page A) and kept in the answers store for the next pages.
  const load = useCallback(async () => {
    const test = await api.fetchWordTest(language());
    if (test.supported) setAnswers({ wordTest: test });
    else router.replace('/onboarding/goal'); // no test for this language
  }, [router]);
  const { failed, retry } = useLoad(load, wordTest !== null);

  const items = wordTest?.pages[page] ?? [];
  const selected = known[page] ?? [];
  const setSelected = (next: string[]) => setAnswers({ known: { ...getAnswers().known, [page]: next } });

  // Every word must have been on screen before moving on: an unseen word counts as "don't know".
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [size, setSize] = useState({ view: 0, content: 0 });
  const [seenTo, setSeenTo] = useState(0); // the lowest point that has been on screen
  const allSeen = size.content <= Math.max(size.view, seenTo) + 8;

  const [busy, setBusy] = useState(false);
  const [nextFailed, setNextFailed] = useState(false);
  async function next(given = getAnswers().known) {
    // A page the user saw always counts, even with nothing tapped: the server reads "C: []" as "C was answered".
    const answers = { ...given, [page]: given[page] ?? [] };
    setAnswers({ known: answers });
    if (page === 'A') return router.push('/onboarding/word-test?page=B');
    if (page === 'D') return router.push('/onboarding/estimate');
    setBusy(true);
    setNextFailed(false);
    try {
      const to = await api.fetchNextPage(language(), answers);
      router.push(to ? `/onboarding/word-test?page=${to}` : '/onboarding/estimate');
    } catch {
      setNextFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <QuestionScreen
      step={stepFor('word-test', PAGES.indexOf(page))}
      title="Tap the words you know"
      message={nextFailed ? 'Could not load the next page. Try again.' : undefined}
      scroll={{
        ref: scrollRef,
        onLayout: (e) => setSize((s) => ({ ...s, view: e.nativeEvent.layout.height })),
        onContentSizeChange: (_w, h) => setSize((s) => ({ ...s, content: h })),
        onScroll: (e) => {
          const bottom = e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height;
          setSeenTo((v) => Math.max(v, bottom));
        },
      }}
      button={
        wordTest && !allSeen
          ? { label: 'See all words ↓', onPress: () => scrollRef.current?.scrollToEnd() }
          : { label: 'Continue', disabled: !wordTest || busy, onPress: () => void next() }
      }
      link={
        wordTest
          ? {
              label: 'I don’t know any of these',
              onPress: () => {
                setSelected([]);
                void next({ ...getAnswers().known, [page]: [] });
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
          <Text style={[type.body, styles.muted]}>
            {wordTest.madeUp ? 'Only tap words you know the meaning of. Some are made up.' : 'Only tap words you know the meaning of.'}
          </Text>
          <View style={styles.meta}>
            <Text style={[type.label, styles.muted]}>{PAGE_TITLE[page]}</Text>
            <Text style={[type.label, styles.count]}>{`${selected.length} SELECTED`}</Text>
          </View>
          <View style={styles.chips}>
            {items.map(({ w, rd }) => {
              const on = selected.includes(w);
              return (
                <Pressable
                  key={w}
                  accessibilityRole="checkbox"
                  accessibilityLabel={w}
                  accessibilityState={{ checked: on }}
                  onPress={() => setSelected(on ? selected.filter((x) => x !== w) : [...selected, w])}
                  style={[styles.chip, rd ? styles.chipTall : null, on && styles.chipOn]}>
                  {/* Selected = green background only, no check mark (Hamid, 2026-11-17: a check makes chips wider and messy). */}
                  <Text style={[type.callout, { color: on ? colors.greenText : colors.text }]}>{w}</Text>
                  {rd ? <Text style={[type.caption, { color: on ? colors.greenText : colors.muted }]}>{rd}</Text> : null}
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
  group: { gap: space[12], marginTop: -space[16] },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[8] },
  muted: { color: colors.muted },
  count: { color: colors.greenText },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  chip: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[16], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipTall: { paddingVertical: space[4] },
  chipOn: { borderColor: levelColors[3], backgroundColor: colors.greenBg },
});
