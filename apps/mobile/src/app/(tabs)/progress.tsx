import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeckSummary, Progress } from '@/api/client';
import { api } from '@/auth/boot';
import { useMe } from '@/auth/me-store';
import { FutureBar } from '@/components/future-bar';
import { GoalGrid } from '@/components/goal-grid';
import { Icon } from '@/components/icon';
import { LevelChain } from '@/components/level-chain';
import { LoadError, Loading } from '@/components/load-state';
import { Meadow } from '@/components/meadow';
import { Kai } from '@/kai/kai';
import { aboutDate, ahead, ghostTrees, levelCard, wordsText } from '@/progress/future';
import { futureMeadow, KAI_CELLS, nowMeadow } from '@/progress/meadow';
import { savesDone } from '@/review/saver';
import { colors, layout, levelColors, levelNew, radius, space, type } from '@/theme/theme';

const trees = (n: number) => `${n} ${n === 1 ? 'tree' : 'trees'}`;
// The meadow's box keeps one shape while the bar is dragged, so nothing on the page jumps. Height / width.
const MEADOW_RATIO = 0.46;
const NO_STOPS: Progress['stops'] = [];
const KAI_SIZE = 64;
const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

// Progress tab (Figma P1), from top to bottom: the number, one meadow with Kai, the future bar (dark green = today;
// a drag shows the forest, the day and the level at 100, 200, 500 and 1,000 words, and letting go comes back to
// today), the level card, the goal grid, and every deck as a short row. One meadow since 2026-11-25 (Hamid): the two
// meadows of before showed the same thing twice.
// No hard words here (Hamid, 2026-11-23): they show on the one-time screen after the first round and in each deck.
export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const [state, setState] = useState<{ progress: Progress | null; failed: boolean }>({ progress: null, failed: false });
  const [decks, setDecks] = useState<{ list: DeckSummary[] | null; failed: boolean }>({ list: null, failed: false });
  const [cheer, setCheer] = useState(0); // a tap on Kai: he celebrates once
  const [peek, setPeek] = useState(-1); // the future bar: -1 = today, or the stop the learner looks at
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
  const stops = useMemo(() => (progress ? ahead(progress.total, progress.stops) : NO_STOPS), [progress]);
  const now = useMemo(() => (progress ? nowMeadow(progress.trees, progress.deckWords, ghostTrees(progress.total, stops[0])) : null), [progress, stops]);
  const ratio = now ? Math.max(MEADOW_RATIO, now.height / now.width) : MEADOW_RATIO;
  // The forest of every stop is made once, so a drag only swaps pictures.
  const futures = useMemo(() => stops.map((s) => futureMeadow(s.words, ratio)), [stops, ratio]);
  const stop = peek >= 0 ? stops[peek] : undefined;
  const future = peek >= 0 ? futures[peek] : undefined;
  const card = progress ? (stop ? levelCard(stop.words, stop.level, stop.vocabulary) : levelCard(progress.total, progress.level, progress.vocabulary)) : null;
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
      ) : !progress || !now || !card ? (
        <Loading label="Loading your progress…" />
      ) : (
        <>
          <View testID="progress-numbers" style={styles.numbers}>
            <Text testID="future-when" style={[type.label, stop ? styles.green : styles.muted]}>
              {stop ? `${aboutDate(stop.by, new Date().getFullYear())}, AT YOUR PACE` : 'TODAY'}
            </Text>
            <Text accessibilityRole="header" style={[type.display, stop ? styles.green : styles.ink]}>
              {wordsText(stop ? stop.words : progress.total)}
            </Text>
            <Text style={[type.body, styles.muted]}>{!stop && progress.total === 1 ? 'word in your word bank' : 'words in your word bank'}</Text>
            {/* The counts are today's: hidden during a peek, but they keep their place. */}
            <View style={[styles.counts, stop && styles.hidden]}>
              <Count levels={[0]} text={`${progress.new} new`} />
              <Count levels={[1, 2, 3, 4]} text={`${progress.learning} learning`} />
              <Count levels={[5]} text={`${progress.mastered} mastered`} />
            </View>
            <Text style={[type.caption, styles.muted, stop && styles.hidden]}>You review each word at least 5 times, with spaced repetition.</Text>
          </View>

          {/* One meadow in a box of one shape. Today: the decks as they are, one tree each (grey trees are still to
              grow), with Kai on the right. During a peek: the forest of that stop. */}
          <View style={[styles.bleed, styles.meadowBox, { aspectRatio: 1 / ratio }]}>
            {future && stop ? (
              <Meadow testID="meadow-future" scene={future} label={`Your meadow with ${wordsText(stop.words)} words: ${trees(future.trees)}`} quick replay={peek} rich />
            ) : (
              <Meadow testID="meadow-now" scene={now} label={`Your meadow now: ${trees(Math.max(1, progress.trees.length))}`}>
                <View style={[styles.kai, { width: `${(KAI_CELLS / now.width) * 100}%`, bottom: `${(1.6 / now.height) * 100}%` }]}>
                  <Kai state={cheer ? 'celebrate' : 'idle'} playKey={cheer} size={KAI_SIZE} onPress={() => setCheer((n) => n + 1)} />
                </View>
              </Meadow>
            )}
          </View>

          <FutureBar total={progress.total} stops={stops} peek={peek} onPeek={setPeek} />
          <View testID="level-card" style={styles.card}>
            <Text style={[type.labelTag, styles.green]}>{card.tag}</Text>
            <Text style={[type.body, styles.ink]}>{card.line}</Text>
          </View>
          <Text style={[type.caption, styles.muted, styles.hint]}>{stops.length === 0 ? 'You passed 1,000 words. What a forest!' : stop ? 'Let go to come back to today' : 'Drag the bar to see your future'}</Text>

          <GoalGrid goal={progress.goal} levels={progress.grid} />

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

// One group of the legend (Hamid, 2026-11-25): a square per level with its number inside (0 = new, 1 to 4 = learning,
// a tick = mastered), in that level's own green, then the count. The dark squares have white marks.
function Count({ levels, text }: { levels: number[]; text: string }) {
  return (
    <View style={styles.count} accessible accessibilityLabel={text}>
      <View style={styles.squares}>
        {levels.map((level) => (
          <View key={level} testID={`legend-${level}`} style={[styles.dot, { backgroundColor: level === 0 ? levelNew : levelColors[level] }]}>
            <Text style={[styles.mark, level >= 3 && styles.markLight]}>{level === 5 ? '✓' : level}</Text>
          </View>
        ))}
      </View>
      <Text style={[type.caption, styles.muted]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.canvas },
  root: { flexGrow: 1, alignItems: 'center', paddingHorizontal: layout.sideMargin, paddingBottom: layout.tabBarClearance + space[24], gap: space[8] },
  numbers: { alignItems: 'center', gap: space[8] },
  counts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space[12], rowGap: space[8] },
  count: { flexDirection: 'row', alignItems: 'center', gap: space[4] + 2 },
  squares: { flexDirection: 'row', gap: 2 },
  dot: { width: 16, height: 16, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  mark: { fontFamily: type.caption.fontFamily, fontSize: 10, lineHeight: 12, color: colors.greenText },
  markLight: { color: colors.white },
  // The meadows run from edge to edge of the screen (Figma), past the page's side margin.
  bleed: { alignSelf: 'stretch', marginHorizontal: -layout.sideMargin, marginTop: space[16], marginBottom: space[8] },
  meadowBox: { justifyContent: 'flex-end' },
  hidden: { opacity: 0 },
  card: { alignSelf: 'stretch', gap: space[8], padding: space[16], borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, minHeight: 104 },
  hint: { marginBottom: space[24] },
  kai: { position: 'absolute', right: 0, alignItems: 'center' },
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
