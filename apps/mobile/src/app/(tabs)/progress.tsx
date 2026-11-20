import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Progress } from '@/api/client';
import { api } from '@/auth/boot';
import { useMe } from '@/auth/me-store';
import { GoalGrid } from '@/components/goal-grid';
import { Icon } from '@/components/icon';
import { LoadError, Loading } from '@/components/load-state';
import { Meadow } from '@/components/meadow';
import { Kai } from '@/kai/kai';
import { colors, layout, levelColors, radius, space, type } from '@/theme/theme';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
// "2026-12-29" → "DEC 29"
const shortDate = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1] ?? ''} ${Number(day.slice(8, 10))}`;

// Progress tab (Figma P1): the word bank, the goal grid with its date, and the meadow (one tree per deck).
export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const [state, setState] = useState<{ progress: Progress | null; failed: boolean }>({ progress: null, failed: false });
  // Loads every time the tab comes into view: a round or a new deck changes the numbers.
  const load = useCallback(() => {
    api.fetchProgress().then(
      (progress) => setState({ progress, failed: false }),
      () => setState({ progress: null, failed: true }),
    );
  }, []);
  useFocusEffect(load);

  const { progress, failed } = state;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.root, { paddingTop: insets.top + space[48] }]}>
      {failed ? (
        <LoadError
          message="Could not load your progress."
          onRetry={() => {
            setState({ progress: null, failed: false });
            load();
          }}
        />
      ) : !progress ? (
        <Loading label="Loading your progress…" />
      ) : (
        <>
          <Text accessibilityRole="header" style={[type.display, styles.ink]}>
            {progress.total}
          </Text>
          <Text style={[type.body, styles.muted]}>{progress.total === 1 ? 'word in your word bank' : 'words in your word bank'}</Text>
          <View style={styles.counts}>
            <Count color={levelColors[1]} text={`${progress.new} new`} />
            <Count color={levelColors[3]} text={`${progress.learning} learning`} />
            <Count color={levelColors[5]} text={`${progress.mastered} mastered`} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${progress.decks} ${progress.decks === 1 ? 'Deck' : 'Decks'}`} onPress={() => router.push('/decks')} style={styles.decks}>
            <Icon name="deck" size={24} color={colors.greenText} />
            <Text style={[type.headline, styles.green]}>{`${progress.decks} ${progress.decks === 1 ? 'Deck' : 'Decks'}`}</Text>
            <Icon name="next" size={16} color={colors.greenText} />
          </Pressable>

          {/* Kai stands on a strip of ground, above the goal grid. */}
          <View style={styles.kaiStrip}>
            <Kai state="idle" size={72} />
            <View style={styles.ground} />
          </View>
          <GoalGrid goal={progress.goal} levels={progress.grid} />

          <View style={styles.byRow}>
            <View style={styles.rule} />
            <Text style={[type.label, styles.muted]}>{`BY ${shortDate(progress.masterBy)}`}</Text>
            <View style={styles.rule} />
          </View>
          <Text style={[type.body, styles.muted]}>you’ll master</Text>
          <Text style={[type.display, styles.green]}>{progress.goal}</Text>
          <Text style={[type.body, styles.muted]}>{progress.language ? `new ${progress.language} words` : 'new words'}</Text>

          <View style={styles.meadow}>
            <Meadow trees={progress.trees} />
          </View>
        </>
      )}
      {__DEV__ && me ? (
        // Dev builds only: lets the Maestro flows check that the guest user survives a restart.
        <Text testID="dev-user-id" style={[type.caption, styles.dev]}>
          {me.id}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Count({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.count}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[type.callout, styles.muted]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.canvas },
  root: { flexGrow: 1, alignItems: 'center', paddingHorizontal: layout.sideMargin, paddingBottom: layout.tabBarClearance + space[24], gap: space[8] },
  counts: { flexDirection: 'row', gap: space[16] },
  count: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  dot: { width: 10, height: 10, borderRadius: 2 },
  kaiStrip: { width: '100%', alignItems: 'center', marginTop: space[24] },
  ground: { width: '100%', height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: -space[4] },
  byRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: space[12], marginTop: space[24] },
  rule: { flex: 1, height: 1, backgroundColor: colors.divider },
  meadow: { width: '100%', marginTop: space[16] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  decks: { marginTop: space[16], height: 52, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[24], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.button, backgroundColor: colors.greenBg },
  dev: { color: colors.subtle },
});
