import { Stack, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Direction, ReviewCard } from '@/api/client';
import { api } from '@/auth/boot';
import { Icon, type IconName } from '@/components/icon';
import { getAnswers } from '@/onboarding/store';
import { isIntroDone } from '@/review/intro';
import { advance, useRound } from '@/review/round-store';
import { colors, layout, levelColors, lift, radius, space, type } from '@/theme/theme';

type Stamp = { title: string; sub: string; kind: Direction };
const STAMP_MS = process.env.NODE_ENV === 'test' ? 60 : 900; // how long the stamp stays before the next card
const SWIPE_DISTANCE = 90;

const stampFor = (direction: Direction, backInDays: number | null): Stamp =>
  direction === 'easy'
    ? { kind: 'easy', title: 'EASY', sub: `BACK IN ${backInDays} ${backInDays === 1 ? 'DAY' : 'DAYS'}` }
    : direction === 'hard'
      ? { kind: 'hard', title: 'HARD', sub: 'GOES TO YOUR LOCK SCREEN' }
      : { kind: 'known', title: 'KNOW IT', sub: 'WON’T SHOW AGAIN' };

// A review round (Figma O12 / A3–A5): one card at a time, no tab bar.
export default function RoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cards, index } = useRound();
  const card = cards[index];
  // Which card is flipped (by id), so a new card always starts on its front.
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const flipped = card !== undefined && flippedId === card.id;
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const [drag] = useState(() => new Animated.ValueXY());

  // Past the last card (by a swipe here or by "Next card" in Use it): leave the round.
  const done = index >= cards.length;
  useEffect(() => {
    if (!done) return;
    let live = true;
    // The very first finished round shows the one-time screens (hard words → trial → paywall).
    isIntroDone().then((seen) => live && router.replace(seen || cards.length === 0 ? '/(tabs)/review' : '/intro/hard-words'));
    return () => {
      live = false;
    };
  }, [done, cards.length, router]);

  async function swipe(direction: Direction, current: ReviewCard) {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    try {
      const result = await api.swipeCard(current.id, direction);
      setStamp(stampFor(direction, result.backInDays));
      await new Promise((resolve) => setTimeout(resolve, STAMP_MS));
      setStamp(null);
      drag.setValue({ x: 0, y: 0 });
      advance();
    } catch {
      setFailed(true);
      Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    } finally {
      busy.current = false;
    }
  }

  // The newest card and swipe handler for the gesture, which is created once.
  const latest = useRef<{ card: ReviewCard | undefined; swipe: typeof swipe } | null>(null);
  useEffect(() => {
    latest.current = { card, swipe };
  });
  // eslint-disable-next-line react-hooks/refs -- `latest` is read later, inside the gesture callbacks, not during render
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 || g.dy < -12,
      onPanResponderMove: Animated.event([null, { dx: drag.x, dy: drag.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_e, g) => {
        const direction: Direction | null = g.dx > SWIPE_DISTANCE ? 'easy' : g.dx < -SWIPE_DISTANCE ? 'hard' : g.dy < -SWIPE_DISTANCE ? 'known' : null;
        const current = latest.current?.card;
        if (direction && current) void latest.current?.swipe(direction, current);
        else Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
      // Another gesture took over (for example a system gesture): put the card back.
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
    }),
  );

  if (!card) return <View style={styles.root} />;

  const left = cards.length - index;
  const bare = card.word.replace(/^\S+\s+/, ''); // the word without its article, to color it in the example
  const parts = card.example.split(bare);
  const rotate = drag.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-8deg', '0deg', '8deg'] });

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space[16]) }]}>
      {/* iOS swipe-back would steal the Easy swipe (right). The Close button leaves the round. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.replace('/(tabs)/review')} style={styles.close}>
          <Icon name="close" color={colors.muted} />
        </Pressable>
        <View style={styles.progress}>
          <View style={[styles.fill, { width: `${(index / cards.length) * 100}%` }]} />
        </View>
      </View>
      <Text style={[type.caption, styles.left]}>{`${left} ${left === 1 ? 'word' : 'words'} left`}</Text>

      <View style={styles.deck}>
        <View style={styles.chip}>
          <Icon name="deck" color={colors.text2} />
          <Text style={[type.captionStrong, styles.ink]}>{card.deckTopic}</Text>
        </View>
        <View style={styles.under} />
        <Animated.View style={[styles.card, { transform: [{ translateX: drag.x }, { translateY: drag.y }, { rotate }] }]} {...pan.panHandlers}>
          <Pressable testID="review-card" accessible={false} onPress={() => setFlippedId(flipped ? null : card.id)} style={styles.cardBody}>
            {stamp ? (
              <View style={styles.stampBox}>
                <View style={[styles.stamp, stamp.kind === 'hard' && styles.stampHard, stamp.kind === 'known' && styles.stampKnown]}>
                  <Text testID="stamp-title" style={[type.stamp, { color: stamp.kind === 'hard' ? colors.hard : stamp.kind === 'known' ? colors.white : colors.easy }]}>{stamp.title}</Text>
                </View>
                <Text style={[type.label, { color: stamp.kind === 'hard' ? colors.hard : colors.greenText }]}>{stamp.sub}</Text>
              </View>
            ) : null}
            {flipped ? (
              <View style={styles.back}>
                <View style={styles.wordRow}>
                  <View style={[styles.square, { backgroundColor: levelColors[card.stage] ?? levelColors[0] }]} />
                  <Text style={[type.wordXL, styles.ink, styles.grow]}>{card.word}</Text>
                  <Speaker word={card.word} />
                </View>
                <Text style={[type.headline, styles.text2]}>{card.translation}</Text>
                <View style={styles.rule} />
                <Text accessibilityLabel={card.example} style={[type.body, styles.ink]}>
                  {parts.map((part, i) => (
                    <Text key={i}>
                      {part}
                      {i < parts.length - 1 ? <Text style={[type.bodyStrong, styles.green]}>{bare}</Text> : null}
                    </Text>
                  ))}
                </Text>
                <Text style={[type.callout, styles.muted]}>{card.exampleTranslation}</Text>
                <View style={styles.grow} />
                <Pressable accessibilityRole="button" accessibilityLabel="Use it" onPress={() => router.push(`/use-it/${card.id}`)} style={styles.useIt}>
                  <Icon name="mic" color={colors.white} />
                  <Text style={[type.button, styles.white]}>Use it</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.front}>
                <View style={styles.wordRow}>
                  <View style={[styles.square, { backgroundColor: levelColors[card.stage] ?? levelColors[0] }]} />
                  <Text style={[type.wordXL, styles.ink]}>{card.word}</Text>
                </View>
                <Speaker word={card.word} />
                <Text style={[type.label, styles.muted, styles.tap]}>TAP TO FLIP</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </View>

      {failed ? <Text style={[type.caption, styles.failed]}>Could not save. Try again.</Text> : null}
      <View style={styles.actions}>
        <Action label="Hard" icon="left" color={colors.hard} onPress={() => void swipe('hard', card)} />
        <Action label="Know it" icon="up" color={colors.greenText} onPress={() => void swipe('known', card)} />
        <Action label="Easy" icon="right" color={colors.easy} onPress={() => void swipe('easy', card)} iconLast />
      </View>
    </View>
  );
}

function Speaker({ word }: { word: string }) {
  // shortcut: the language comes from the onboarding answers, so after a restart the phone's default voice is used; send the language with the round later.
  const language = getAnswers().learning?.code ?? undefined;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Say the word" onPress={() => Speech.speak(word, { language })} style={styles.speaker}>
      <Icon name="speaker" color={colors.text2} />
    </Pressable>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: layout.sideMargin },
  top: { height: layout.minTapTarget, flexDirection: 'row', alignItems: 'center', gap: space[8], marginLeft: -space[12] },
  close: { width: layout.minTapTarget, height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.divider, overflow: 'hidden' },
  fill: { height: 4, minWidth: 6, borderRadius: 2, backgroundColor: colors.button },
  left: { color: colors.muted },
  deck: { flex: 1, marginTop: space[24], marginBottom: space[16] },
  chip: { position: 'absolute', top: -14, left: space[16], zIndex: 2, height: 28, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[12], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.chip },
  under: { position: 'absolute', left: space[16], right: space[16], bottom: -space[8], height: 40, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  card: { flex: 1, borderRadius: radius.card, backgroundColor: colors.surface, ...lift, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  cardBody: { flex: 1, padding: space[24] },
  front: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[24] },
  back: { flex: 1, gap: space[12], paddingTop: space[16] },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  square: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: colors.divider },
  grow: { flex: 1 },
  ink: { color: colors.text },
  text2: { color: colors.text2 },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  white: { color: colors.white },
  rule: { height: 1, backgroundColor: colors.divider, marginVertical: space[8] },
  tap: { position: 'absolute', bottom: 0 },
  speaker: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip },
  useIt: { alignSelf: 'center', height: 44, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[24], borderRadius: radius.pill, backgroundColor: colors.button },
  stampBox: { position: 'absolute', top: space[24], left: 0, right: 0, zIndex: 3, alignItems: 'center', gap: space[8], transform: [{ rotate: '-8deg' }] },
  stamp: { paddingHorizontal: space[16], paddingVertical: space[4], borderRadius: radius.badge, borderWidth: 3, borderColor: colors.easy, backgroundColor: colors.surface },
  stampHard: { borderColor: colors.hard },
  stampKnown: { borderColor: colors.know, backgroundColor: colors.know },
  failed: { color: colors.hard, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  action: { height: layout.minTapTarget, flexDirection: 'row', alignItems: 'center', gap: space[8] },
  actionReverse: { flexDirection: 'row-reverse' },
});
