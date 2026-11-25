import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Direction, ReviewCard } from '@/api/client';
import { api } from '@/auth/boot';
import { Icon, type IconName } from '@/components/icon';
import { Kai } from '@/kai/kai';
import { Flashcard, type CardRole } from '@/review/flashcard';
import { isIntroDone } from '@/review/intro';
import { advance, cameBack, getRound, leftForUseIt, putBack, swiped, undone, useRound } from '@/review/round-store';
import { loadReviewRules, useEasyDays } from '@/review/rules';
import { saveSwipe, savesDone } from '@/review/saver';
import { streakToShow } from '@/review/streak';
import { useSwipe } from '@/review/use-swipe';
import { card as cardTokens, colors, layout, lift, radius, space, type } from '@/theme/theme';

// How long a card that left stays drawn (its flight off the screen, with a little room).
const LEAVE_MS = 450;

type Leaving = { key: string; card: ReviewCard; flipped: boolean; sentOff: Direction | null };

// A review round (Figma O12 / A3–A7): one card at a time.
// Two homes: inside the Review tab (`inTab`: the tab bar stays, Figma A3), and as its own screen for the very
// first round (the onboarding practice, Figma O12: no tab bar).
//
// A swipe never waits for the server: the card leaves at once and the next one is already there. The save runs
// in the background (src/review/saver.ts). If it fails, the card comes back as the next card with a message.
export default function RoundScreen({ inTab = false, onDone }: { inTab?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cards, index } = useRound();
  const card = cards[index];
  const next = cards[index + 1];
  const easyDays = useEasyDays();
  // Which card is flipped (by id), so a new card always starts on its front.
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Undo is offered right after a swipe, for that swipe only.
  const [canUndo, setCanUndo] = useState(false);
  // Swipes not saved yet. The round does not end while one is open: a failed save brings its card back.
  const [pending, setPending] = useState(0);
  // Cards on their way off the screen. `era` changes when the round moves backwards (Undo, a failed save), so a
  // card that comes back is drawn new and not mixed up with its own leaving copy.
  const [leaving, setLeaving] = useState<Leaving[]>([]);
  const [era, setEra] = useState(0);
  // The streak card (A7) shows once, after half of the cards this round started with.
  const [half] = useState(() => (cards.length >= 2 ? Math.ceil(cards.length / 2) : -1));
  const [streak, setStreak] = useState<number | null>(null);
  const streakAsked = useRef(false);
  // The full-screen round has a Close button, except in the very first round (the onboarding practice, Figma O12).
  const [canClose, setCanClose] = useState(false);
  const live = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // How far the top card is dragged (0..1), shared with the card under it.
  const lead = useSharedValue(0);

  useEffect(() => {
    live.current = true;
    void loadReviewRules();
    const pendingTimers = timers.current;
    return () => {
      live.current = false;
      pendingTimers.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => {
    if (inTab) return;
    let on = true;
    void isIntroDone().then((seen) => on && setCanClose(seen));
    return () => {
      on = false;
    };
  }, [inTab]);

  // Past the last card (by a swipe here or by "Next card" in Use it), and every swipe saved: leave the round.
  const done = index >= cards.length && pending === 0;
  useEffect(() => {
    if (!done) return;
    if (onDone) return onDone();
    let on = true;
    // The very first finished round shows the one-time screens (hard words → trial → paywall).
    isIntroDone().then((seen) => on && router.replace(seen || cards.length === 0 ? '/(tabs)/review' : '/intro/hard-words'));
    return () => {
      on = false;
    };
  }, [done, cards.length, router, onDone]);

  const keyOf = (i: number, c: ReviewCard) => `${era}:${i}:${c.id}`;
  const startOver = () => {
    setLeaving([]);
    setEra((n) => n + 1);
  };

  // The card leaves now; the server hears about it in the background.
  const commit = useCallback(
    (direction: Direction, byButton: boolean) => {
      const round = getRound();
      const current = round.cards[round.index];
      if (!current) return;
      const key = `${era}:${round.index}:${current.id}`;
      setLeaving((list) => [...list, { key, card: current, flipped: flippedId === current.id, sentOff: byButton ? direction : null }]);
      timers.current.push(setTimeout(() => setLeaving((list) => list.filter((l) => l.key !== key)), LEAVE_MS));
      swiped();
      setFailed(false);
      setCanUndo(true);
      setPending((n) => n + 1);
      if (round.index + 1 === half && !streakAsked.current) {
        streakAsked.current = true;
        void streakToShow().then((days) => live.current && setStreak(days));
      }
      void saveSwipe(current.id, direction).then((result) => {
        if (!live.current) return;
        setPending((n) => n - 1);
        if (!result) {
          // Not saved after a few tries: the card is the next card again.
          putBack(current);
          setFailed(true);
          setCanUndo(false);
          startOver();
        } else if (result.again) cameBack({ ...current, stage: result.stage });
      });
    },
    [era, flippedId, half],
  );

  async function undo() {
    setCanUndo(false);
    try {
      await savesDone(); // the server takes back its last swipe, so ours must be there first
      const before = await api.undoSwipe();
      if (!live.current) return;
      undone(before);
      setStreak(null);
      startOver();
    } catch {
      // Nothing to take back (or no connection): the round stays as it is.
    }
  }

  const onStreak = streak !== null;
  const left = Math.max(0, cards.length - index);
  // The stack, bottom to top: the next card, the card to read, the cards that are leaving.
  const stack: { key: string; card: ReviewCard; role: CardRole; flipped: boolean; sentOff: Direction | null }[] = [];
  if (next) stack.push({ key: keyOf(index + 1, next), card: next, role: 'under', flipped: false, sentOff: null });
  if (card) stack.push({ key: keyOf(index, card), card, role: onStreak ? 'under' : 'top', flipped: flippedId === card.id, sentOff: null });
  for (const l of leaving) stack.push({ ...l, role: 'leaving' });

  return (
    <GestureHandlerRootView style={[styles.root, { paddingTop: insets.top, paddingBottom: inTab ? layout.tabBarClearance : Math.max(insets.bottom, space[16]) }]}>
      {/* iOS swipe-back would steal the Easy swipe (right). */}
      {inTab ? null : <Stack.Screen options={{ gestureEnabled: false }} />}
      <View style={styles.top}>
        {canClose ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.close}>
            <Icon name="close" color={colors.muted} />
          </Pressable>
        ) : null}
        <View style={styles.progress}>
          <View style={[styles.fill, { width: `${cards.length ? (Math.min(index, cards.length) / cards.length) * 100 : 0}%` }]} />
        </View>
      </View>
      <View style={styles.leftRow}>
        <Text style={[type.caption, styles.muted]}>{`${left} ${left === 1 ? 'word' : 'words'} left`}</Text>
        {canUndo ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Undo" onPress={() => void undo()} hitSlop={12}>
            <Text style={[type.captionStrong, styles.green]}>Undo</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.deck}>
        {card ? (
          <View style={styles.chip}>
            <Icon name="deck" color={colors.text2} />
            <Text style={[type.captionStrong, styles.ink]}>{card.deckTopic}</Text>
          </View>
        ) : null}
        {/* The cards behind (Figma: Card stack, peek 1 and peek 2). */}
        {left > 2 ? <View style={[styles.peek, styles.peek2]} /> : null}
        {left > 1 ? <View style={[styles.peek, styles.peek1]} /> : null}
        {stack.map((s) => (
          <Flashcard
            key={s.key}
            card={s.card}
            role={s.role}
            flipped={s.flipped}
            sentOff={s.sentOff}
            easyDays={easyDays?.[s.card.stage] ?? null}
            lead={lead}
            onFlip={() => setFlippedId((id) => (id === s.card.id ? null : s.card.id))}
            canSwipe={!s.card.lookOnly}
            onSwipe={(direction) => commit(direction, false)}
            onUseIt={() => {
              if (inTab) leftForUseIt();
              router.push(`/use-it/${s.card.id}`);
            }}
          />
        ))}
        {onStreak ? <StreakCard days={streak} onDone={() => setStreak(null)} /> : null}
      </View>

      {failed ? <Text style={[type.caption, styles.failed]}>Could not save. Try again.</Text> : null}
      {/* The streak card has no answer: the three actions are hidden while it shows. */}
      <View style={[styles.actions, card?.lookOnly && styles.actionsNext]}>
        {onStreak || !card ? null : card.lookOnly ? (
          // The word tapped on the widget is not due today: it can be looked at (flip, speaker, Use it), not swiped.
          <Action
            label="Next"
            icon="right"
            color={colors.greenText}
            iconLast
            onPress={() => {
              setCanUndo(false);
              setFlippedId(null);
              advance();
            }}
          />
        ) : (
          <>
            <Action label="Hard" icon="left" color={colors.hard} onPress={() => commit('hard', true)} />
            <Action label="Know it" icon="up" color={colors.greenText} onPress={() => commit('known', true)} />
            <Action label="Easy" icon="right" color={colors.easy} onPress={() => commit('easy', true)} iconLast />
          </>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

// The streak card (Figma A7): on top of the stack; a tap or a swipe in any direction goes on.
function StreakCard({ days, onDone }: { days: number; onDone(): void }) {
  const lead = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const { pan, cardStyle } = useSwipe({ enabled: true, lead, onSwipe: () => (timer.current = setTimeout(onDone, cardTokens.flyMs)) });
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.streakCard, cardStyle]}>
        <Pressable testID="streak-card" accessible={false} onPress={onDone} style={styles.streak}>
          <Kai state="streak" size={168} />
          <Text style={[type.display, styles.green]}>{days}</Text>
          <Text style={[type.headline, styles.ink]}>day streak 🔥</Text>
          <Text style={[type.callout, styles.muted, styles.streakLine]}>{`You came back ${days} days in a row. Keep it going!`}</Text>
          <Text style={[type.label, styles.muted, styles.tap]}>SWIPE TO CONTINUE</Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

function Action({ label, icon, color, onPress, iconLast = false }: { label: string; icon: IconName; color: string; onPress(): void; iconLast?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.action, iconLast && styles.actionReverse]}>
      <Icon name={icon} color={color} />
      <Text style={[type.label, { color }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: layout.sideMargin },
  top: { height: space[32], flexDirection: 'row', alignItems: 'center', gap: space[8] },
  close: { width: space[32], height: space[32], alignItems: 'center', justifyContent: 'center', marginLeft: -space[8] },
  leftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.divider, overflow: 'hidden' },
  fill: { height: 4, minWidth: 6, borderRadius: 2, backgroundColor: colors.button },
  deck: { flex: 1, marginTop: space[24], marginBottom: space[24] + space[4] },
  chip: { position: 'absolute', top: -14, left: space[16], zIndex: 2, height: 28, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[12], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.chip },
  peek: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  peek1: { left: cardTokens.peek, right: cardTokens.peek, bottom: -cardTokens.peek },
  peek2: { left: cardTokens.peek * 2, right: cardTokens.peek * 2, bottom: -cardTokens.peek * 2 },
  streakCard: { ...FILL, borderRadius: radius.card, backgroundColor: colors.surface, ...lift, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  streak: { flex: 1, padding: space[24], alignItems: 'center', justifyContent: 'center', gap: space[8] },
  streakLine: { textAlign: 'center', maxWidth: 240 },
  tap: { position: 'absolute', bottom: space[24] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  failed: { color: colors.hard, textAlign: 'center' },
  actions: { minHeight: layout.minTapTarget, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionsNext: { justifyContent: 'flex-end' },
  action: { height: layout.minTapTarget, flexDirection: 'row', alignItems: 'center', gap: space[8] },
  actionReverse: { flexDirection: 'row-reverse' },
});
