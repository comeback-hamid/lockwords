import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/auth/boot';
import { Icon } from '@/components/icon';
import { LoadError, Loading } from '@/components/load-state';
import { useLoad } from '@/components/use-load';
import { colors, layout, levelColors, radius, space, type } from '@/theme/theme';

const DELETE_WIDTH = 86; // the red Delete button behind a word row (Figma N7)
const plural = (n: number) => (n === 1 ? '1 word' : `${n} words`);

// A deck's words (Figma N7). Swipe a word left to remove it; "Remove deck" removes the whole deck.
// shortcut: the rest of N7 / P3 (the title in the learning language, pictures, "Practice these words") comes with the decks epic.
export default function DeckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => api.fetchDeck(id), [id]);
  const { data: deck, failed, retry } = useLoad(load);
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set()); // words removed here; a failed call puts the word back in its place
  const [openId, setOpenId] = useState<string | null>(null); // the one row that shows its Delete button
  const [problem, setProblem] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const cards = deck ? deck.cards.filter((c) => !gone.has(c.id)) : [];

  async function removeWord(cardId: string) {
    setOpenId(null);
    setProblem(null);
    setGone((all) => new Set(all).add(cardId));
    try {
      await api.removeCard(cardId);
    } catch {
      setGone((all) => new Set([...all].filter((g) => g !== cardId)));
      setProblem('Could not remove the word.');
    }
  }
  async function removeDeck() {
    setRemoving(true);
    setProblem(null);
    try {
      await api.removeDeck(id);
    } catch {
      setRemoving(false);
      setProblem('Could not remove the deck.');
      return;
    }
    // Back to where the learner came from. A deck opened right after onboarding has nothing behind it.
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }
  function askRemoveDeck() {
    if (removing) return;
    setOpenId(null);
    Alert.alert('Remove this deck?', cards.length ? `Its ${plural(cards.length)} ${cards.length === 1 ? 'leaves' : 'leave'} Review. This cannot be undone.` : 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeDeck() },
    ]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.replace('/(tabs)')} style={styles.close}>
          <Icon name="close" size={24} color={colors.text} />
        </Pressable>
        {deck ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Remove deck" accessibilityState={{ disabled: removing }} onPress={askRemoveDeck} style={styles.remove}>
            <Text style={[type.calloutMedium, styles.danger]}>Remove deck</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[24] }]}>
        {failed ? (
          <LoadError message="Could not load the deck." onRetry={retry} />
        ) : !deck ? (
          <Loading label="Loading words…" />
        ) : (
          <>
            <View style={styles.head}>
              <Text accessibilityRole="header" style={[type.title, styles.ink]}>
                {deck.topic}
              </Text>
              <Text style={[type.label, styles.muted]}>{`${deck.cefr} · ${plural(cards.length).toUpperCase()}`}</Text>
            </View>
            {problem ? (
              <Text accessibilityRole="alert" style={[type.callout, styles.danger]}>
                {problem}
              </Text>
            ) : null}
            {cards.length === 0 ? (
              <Text style={[type.callout, styles.muted]}>No words in this deck.</Text>
            ) : (
              <View style={styles.list}>
                <Text style={[type.caption, styles.muted]}>Swipe left on a word to remove it</Text>
                <View style={styles.box}>
                  {cards.map((card, i) => (
                    <SwipeRow
                      key={card.id}
                      label={`${card.word}, ${card.translation}`}
                      deleteLabel={`Delete ${card.word}`}
                      open={openId === card.id}
                      onOpen={() => setOpenId(card.id)}
                      onClose={() => setOpenId((now) => (now === card.id ? null : now))}
                      onDelete={() => void removeWord(card.id)}
                      divider={i < cards.length - 1}
                    >
                      <View style={[styles.square, { backgroundColor: levelColors[card.stage] ?? levelColors[0] }]} />
                      <Text style={[type.bodyStrong, styles.ink, styles.word]}>{card.word}</Text>
                      <Text style={[type.callout, styles.muted]}>{card.translation}</Text>
                    </SwipeRow>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

type SwipeRowProps = { label: string; deleteLabel: string; open: boolean; onOpen(): void; onClose(): void; onDelete(): void; divider: boolean; children: ReactNode };

// One word row. A pull to the left slides it away and shows the red Delete button behind it (the same PanResponder way as the review card).
// Screen readers get the same thing as the row's "Delete" action.
function SwipeRow({ label, deleteLabel, open, onOpen, onClose, onDelete, divider, children }: SwipeRowProps) {
  const [x] = useState(() => new Animated.Value(0));
  const live = useRef({ open, onOpen, onClose });
  useEffect(() => {
    live.current = { open, onOpen, onClose };
  });
  const settle = useCallback((toOpen: boolean) => Animated.spring(x, { toValue: toOpen ? -DELETE_WIDTH : 0, useNativeDriver: false, bounciness: 0 }).start(), [x]);
  useEffect(() => settle(open), [open, settle]);
  // eslint-disable-next-line react-hooks/refs -- `live` is read later, inside the gesture callbacks, not during render
  const [pan] = useState(() =>
    PanResponder.create({
      // Only a clear sideways pull is ours; up and down belongs to the list.
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => x.setValue(Math.max(-DELETE_WIDTH, Math.min(0, (live.current.open ? -DELETE_WIDTH : 0) + g.dx))),
      onPanResponderRelease: (_e, g) => {
        const at = (live.current.open ? -DELETE_WIDTH : 0) + g.dx;
        const toOpen = at < -DELETE_WIDTH / 2 || g.vx < -0.5;
        settle(toOpen); // also when nothing changes for the parent: the row goes back to where it belongs
        if (toOpen) live.current.onOpen();
        else live.current.onClose();
      },
      onPanResponderTerminate: () => settle(live.current.open),
    }),
  );
  return (
    <View style={[styles.rowWrap, divider && styles.divider]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={deleteLabel}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'yes' : 'no-hide-descendants'}
        onPress={onDelete}
        style={styles.delete}
      >
        <Text style={[type.bodyStrong, styles.deleteLabel]}>Delete</Text>
      </Pressable>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>
        <Pressable
          accessible
          accessibilityLabel={label}
          accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'delete') onDelete();
          }}
          onPress={() => {
            if (open) onClose();
          }}
          style={styles.row}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  topBar: { height: 44, paddingLeft: 2, paddingRight: layout.sideMargin - space[8], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: layout.minTapTarget, height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  remove: { height: layout.minTapTarget, justifyContent: 'center', paddingHorizontal: space[8] },
  danger: { color: colors.hard },
  content: { paddingHorizontal: layout.sideMargin, paddingTop: space[24], gap: space[24] },
  head: { gap: space[8] },
  list: { gap: space[8] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  rowWrap: { backgroundColor: colors.surface },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16], backgroundColor: colors.surface },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  delete: { position: 'absolute', top: 0, bottom: 0, right: 0, width: DELETE_WIDTH, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.hard },
  deleteLabel: { color: colors.white },
  square: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: colors.divider },
  word: { flex: 1 },
});
