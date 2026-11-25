import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeckSummary, Progress } from '@/api/client';
import { api } from '@/auth/boot';
import { useMe } from '@/auth/me-store';
import { GoalGrid } from '@/components/goal-grid';
import { Icon } from '@/components/icon';
import { LevelChain } from '@/components/level-chain';
import { LoadError, Loading } from '@/components/load-state';
import { Meadow } from '@/components/meadow';
import { Kai } from '@/kai/kai';
import { goalMeadow, KAI_CELLS, nowMeadow } from '@/progress/meadow';
import { savesDone } from '@/review/saver';
import { colors, layout, levelColors, radius, space, type } from '@/theme/theme';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
// "2026-12-29" → "DEC 29"
const shortDate = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1] ?? ''} ${Number(day.slice(8, 10))}`;
const trees = (n: number) => `${n} ${n === 1 ? 'tree' : 'trees'}`;
const KAI_SIZE = 64;
const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

// Progress tab (Figma P1), from top to bottom: the numbers, the small meadow with Kai (the decks as they are now),
// the goal grid with its date, the big meadow (the forest at the goal), and every deck as a short row.
// No hard words here (Hamid, 2026-11-23): they show on the one-time screen after the first round and in each deck.
export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const [state, setState] = useState<{ progress: Progress | null; failed: boolean }>({ progress: null, failed: false });
  const [decks, setDecks] = useState<{ list: DeckSummary[] | null; failed: boolean }>({ list: null, failed: false });
  const [cheer, setCheer] = useState(0); // a tap on Kai: he celebrates once
  const loadDecks = useCallback(() => {
    api.fetchDecks().then(
      (list) => setDecks({ list, failed: false }),
      () => setDecks({ list: null, failed: true }),
    );
  }, []);
  // Loads every time the tab comes into view: a round or a new deck changes the numbers.
  // Swipes are saved in the background: wait for them, so a round left half-way is already in the numbers.
  const load = useCallback(() => {
    void savesDone()
      .then(() => api.fetchProgress())
      .then(
        (progress) => setState({ progress, failed: false }),
        () => setState({ progress: null, failed: true }),
      );
    loadDecks();
  }, [loadDecks]);
  useFocusEffect(load);

  const { progress, failed } = state;
  const now = useMemo(() => (progress ? nowMeadow(progress.trees, progress.deckWords) : null), [progress]);
  const goal = useMemo(() => (progress ? goalMeadow(progress.goal) : null), [progress]);
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.root, { paddingTop: insets.top + space[48] }]}>
      {__DEV__ && me ? (
        // Dev builds only: lets the Maestro flows check that the guest user survives a restart. At the top, so it is on screen without scrolling.
        <Text testID="dev-user-id" style={[type.caption, styles.dev]}>
          {me.id}
        </Text>
      ) : null}
      {failed ? (
        <LoadError
          message="Could not load your progress."
          onRetry={() => {
            setState({ progress: null, failed: false });
            load();
          }}
        />
      ) : !progress || !now || !goal ? (
        <Loading label="Loading your progress…" />
      ) : (
        <>
          <View testID="progress-numbers" style={styles.numbers}>
            <Text accessibilityRole="header" style={[type.display, styles.ink]}>
              {progress.total}
            </Text>
            <Text style={[type.body, styles.muted]}>{progress.total === 1 ? 'word in your word bank' : 'words in your word bank'}</Text>
            <View style={styles.counts}>
              <Count color={levelColors[1]} text={`${progress.new} new`} />
              <Count color={levelColors[3]} text={`${progress.learning} learning`} />
              <Count color={levelColors[5]} text={`${progress.mastered} mastered`} />
            </View>
          </View>

          {/* The decks as they are now, one tree each. Kai stands on the ground, on the right. */}
          <View style={styles.bleed}>
            <Meadow testID="meadow-now" scene={now} label={`Your meadow now: ${trees(now.trees)}`}>
              <View style={[styles.kai, { width: `${(KAI_CELLS / now.width) * 100}%`, bottom: `${(1.6 / now.height) * 100}%` }]}>
                <Kai state={cheer ? 'celebrate' : 'idle'} playKey={cheer} size={KAI_SIZE} onPress={() => setCheer((n) => n + 1)} />
              </View>
            </Meadow>
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

          {/* The forest at the goal: big trees. */}
          <View style={[styles.bleed, styles.goalMeadow]}>
            <Meadow testID="meadow-goal" scene={goal} label={`Your meadow at the goal: ${trees(goal.trees)}`} rich />
          </View>

          <View style={styles.decks}>
            {/* "You have 5 decks", the number in green like the goal (Figma P1). */}
            <Text testID="decks-title" accessibilityRole="header" style={[type.title, styles.ink]}>
              {progress.decks === 0 ? (
                'You have no decks yet'
              ) : (
                <>
                  {'You have '}
                  <Text testID="decks-count" style={styles.green}>
                    {progress.decks}
                  </Text>
                  {progress.decks === 1 ? ' deck' : ' decks'}
                </>
              )}
            </Text>
            {decks.failed ? (
              <LoadError
                message="Could not load your decks."
                onRetry={() => {
                  setDecks({ list: null, failed: false });
                  loadDecks();
                }}
              />
            ) : !decks.list ? (
              <Loading label="Loading your decks…" />
            ) : decks.list.length === 0 ? (
              <Text style={[type.callout, styles.muted]}>Ask Kai for one in New words.</Text>
            ) : (
              <View style={styles.box}>
                {decks.list.map((deck, i, list) => (
                  <DeckRow key={deck.id} deck={deck} divider={i < list.length - 1} onPress={() => router.push(`/deck/${deck.id}`)} />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// One deck as a short row (Figma "Deck list row"): its name, its numbers, a chain of level squares and an arrow.
function DeckRow({ deck, divider, onPress }: { deck: DeckSummary; divider: boolean; onPress(): void }) {
  const numbers = `${count(deck.words, 'word')} · ${deck.learning ? `${deck.learning} learning` : 'all new'}`;
  return (
    // The label says everything the row shows (a screen reader, and Maestro, read the label, not the texts inside).
    <Pressable accessibilityRole="button" accessibilityLabel={`${deck.topic}, ${numbers}`} onPress={onPress} style={[styles.row, divider && styles.divider]}>
      <View style={styles.rowIcon}>
        <Icon name="deck" size={24} color={colors.greenText} />
      </View>
      <View style={styles.rowText}>
        <Text style={[type.bodyStrong, styles.ink]} numberOfLines={1}>
          {deck.topic}
        </Text>
        <Text style={[type.caption, styles.muted]}>{numbers}</Text>
        <View style={styles.chain}>
          <LevelChain stages={deck.stages} />
        </View>
      </View>
      <Icon name="next" size={16} color={colors.muted} />
    </Pressable>
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
  numbers: { alignItems: 'center', gap: space[8] },
  counts: { flexDirection: 'row', gap: space[16] },
  count: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  dot: { width: 10, height: 10, borderRadius: 2 },
  // The meadows run from edge to edge of the screen (Figma), past the page's side margin.
  bleed: { alignSelf: 'stretch', marginHorizontal: -layout.sideMargin, marginTop: space[16], marginBottom: space[8] },
  goalMeadow: { marginTop: space[24] },
  kai: { position: 'absolute', right: 0, alignItems: 'center' },
  byRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: space[12], marginTop: space[24] },
  rule: { flex: 1, height: 1, backgroundColor: colors.divider },
  decks: { width: '100%', gap: space[16], marginTop: space[32] },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[16] },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowIcon: { width: 40, height: 40, borderRadius: radius.badge, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenBg },
  rowText: { flex: 1, gap: space[4] },
  chain: { alignItems: 'flex-start' },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  dev: { color: colors.subtle },
});
