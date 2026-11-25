import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeckSummary, Progress } from '@/api/client';
import { api } from '@/auth/boot';
import { useMe } from '@/auth/me-store';
import { GoalGrid } from '@/components/goal-grid';
import { Icon } from '@/components/icon';
import { LangText } from '@/components/lang-text';
import { LevelChain } from '@/components/level-chain';
import { LoadError, Loading } from '@/components/load-state';
import { Meadow } from '@/components/meadow';
import { TimeTab } from '@/components/time-tab';
import { Kai } from '@/kai/kai';
import { futureMeadow, KAI_CELLS, nowMeadow } from '@/progress/meadow';
import { savesDone } from '@/review/saver';
import { colors, layout, levelColors, levelNew, radius, space, type } from '@/theme/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2027-02-23" → "Feb 23"
const shortDate = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1] ?? ''} ${Number(day.slice(8, 10))}`;
const todayDate = () => {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const trees = (n: number) => `${n} ${n === 1 ? 'tree' : 'trees'}`;
const KAI_SIZE = 64;
const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

// Progress tab (Figma P1 · Today / In 3 months), from top to bottom: the time switch, the numbers with the legend,
// one meadow with Kai, the words map, and every deck as a short row. The switch shows the same page as it will be in
// 3 months at the learner's pace (the server's guess): more words, a bigger forest, a greener words map. The decks
// stay today's: nobody knows the future ones. One meadow since 2026-11-25 (Hamid): the two meadows of before showed
// the same thing twice. Coming back to the tab always opens on Today.
// No hard words here (Hamid, 2026-11-23): they show on the one-time screen after the first round and in each deck.
export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const [state, setState] = useState<{ progress: Progress | null; failed: boolean }>({ progress: null, failed: false });
  const [decks, setDecks] = useState<{ list: DeckSummary[] | null; failed: boolean }>({ list: null, failed: false });
  const [cheer, setCheer] = useState(0); // a tap on Kai: he celebrates once
  const [future, setFuture] = useState(false); // the time switch: false = Today
  const loadDecks = useCallback(() => {
    api.fetchDecks().then(
      (list) => setDecks({ list, failed: false }),
      () => setDecks({ list: null, failed: true }),
    );
  }, []);
  // Loads every time the tab comes into view: a round or a new deck changes the numbers.
  // Swipes are saved in the background: wait for them, so a round left half-way is already in the numbers.
  const load = useCallback(() => {
    setFuture(false);
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
  const then = useMemo(() => (progress ? futureMeadow(progress.future.total) : null), [progress]);
  // What the page shows: today's numbers, or the server's guess for 3 months from now.
  const shown = progress ? (future ? progress.future : progress) : null;
  const scene = future ? then : now;
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
      ) : !progress || !now || !then || !shown || !scene ? (
        <Loading label="Loading your progress…" />
      ) : (
        <>
          <TimeTab future={future} today={todayDate()} by={`by ${shortDate(progress.future.by)}`} onChange={setFuture} />
          <View testID="progress-numbers" style={styles.numbers}>
            {/* The future is a guess: it says so, and its number is green. */}
            <Text style={[type.label, styles.green, !future && styles.hidden]}>ABOUT, AT YOUR PACE</Text>
            <Text accessibilityRole="header" style={[type.display, future ? styles.green : styles.ink]}>
              {shown.total}
            </Text>
            <Text style={[type.body, styles.muted]}>{shown.total === 1 ? 'word in your word bank' : 'words in your word bank'}</Text>
            <View style={styles.counts}>
              <Count levels={[0]} text={`${shown.new} new`} />
              <Count levels={[1, 2, 3, 4]} text={`${shown.learning} learning`} />
              <Count levels={[5]} text={`${shown.mastered} mastered`} />
            </View>
          </View>

          {/* One meadow. Today: the decks as they are, one tree each. In 3 months: the forest of that many words.
              Kai stands on the ground, on the right, in both. */}
          <View style={styles.bleed}>
            <Meadow
              key={future ? 'then' : 'now'}
              testID={future ? 'meadow-future' : 'meadow-now'}
              scene={scene}
              label={future ? `Your meadow in 3 months: ${trees(then.trees)}` : `Your meadow now: ${trees(now.trees)}`}
              rich={future}
            >
              <View style={[styles.kai, { width: `${(KAI_CELLS / scene.width) * 100}%`, bottom: `${(1.6 / scene.height) * 100}%` }]}>
                <Kai state={cheer ? 'celebrate' : 'idle'} playKey={cheer} size={KAI_SIZE} onPress={() => setCheer((n) => n + 1)} />
              </View>
            </Meadow>
          </View>

          {/* The words map: one square per word. Today it runs to the goal (empty squares are still to come);
              in 3 months every square is a word. */}
          <GoalGrid goal={future ? shown.total : progress.goal} levels={shown.grid} />

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
            {future && progress.future.moreDecks > 0 ? (
              <Text style={[type.callout, styles.muted, styles.more]}>{`and about ${progress.future.moreDecks} more ${progress.future.moreDecks === 1 ? 'deck' : 'decks'} by then`}</Text>
            ) : null}
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
        <LangText style={[type.bodyStrong, styles.ink]} numberOfLines={1}>
          {deck.topic}
        </LangText>
        <Text style={[type.caption, styles.muted]}>{numbers}</Text>
        <View style={styles.chain}>
          <LevelChain stages={deck.stages} />
        </View>
      </View>
      <Icon name="next" size={16} color={colors.muted} />
    </Pressable>
  );
}

// One group of the legend (Figma: Legend): a square per level in that level's own green (new is the lightest, the
// four learning levels run light to dark, mastered is the darkest with a tick), then the count. No numbers inside.
function Count({ levels, text }: { levels: number[]; text: string }) {
  return (
    <View style={styles.count} accessible accessibilityLabel={text}>
      <View style={styles.squares}>
        {levels.map((level) => (
          <View key={level} testID={`legend-${level}`} style={[styles.dot, level === 5 && styles.dotTick, { backgroundColor: level === 0 ? levelNew : levelColors[level] }]}>
            {level === 5 ? <Text style={styles.tick}>✓</Text> : null}
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
  more: { textAlign: 'center' },
  numbers: { alignItems: 'center', gap: space[8] },
  counts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space[12], rowGap: space[8] },
  count: { flexDirection: 'row', alignItems: 'center', gap: space[4] + 2 },
  squares: { flexDirection: 'row', gap: 2 },
  dot: { width: 10, height: 10, borderRadius: 2 },
  dotTick: { width: 14, height: 14, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  tick: { fontFamily: type.bodyStrong.fontFamily, fontSize: 9, lineHeight: 12, color: colors.white },
  hidden: { opacity: 0 },
  // The meadows run from edge to edge of the screen (Figma), past the page's side margin.
  bleed: { alignSelf: 'stretch', marginHorizontal: -layout.sideMargin, marginTop: space[16], marginBottom: space[8] },
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
