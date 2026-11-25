import { Image } from 'expo-image';
import { memo, useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, type AnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import type { Direction, ReviewCard } from '@/api/client';
import { Icon } from '@/components/icon';
import { sayWord, warmUpSpeech } from '@/review/speak';
import { useSwipe } from '@/review/use-swipe';
import { wordLayout } from '@/review/word-size';
import { card as tokens, colors, layout, levelColors, lift, radius, space, type } from '@/theme/theme';

// Where a card is in the stack. `top` is the one the learner reads and moves. `under` is the next card, already
// drawn so it is there the moment the top one leaves. `leaving` is on its way off the screen.
export type CardRole = 'top' | 'under' | 'leaving';

// Not read by a screen reader (and not found by a test or a Maestro flow as "visible").
const UNREAD = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants', 'aria-hidden': true } as const;
const unread = (hide: boolean) => (hide ? UNREAD : null);

const UNDER_SCALE = 0.96;
const WORD_ROW_TOP = space[4];
const BACK_BODY_TOP = space[24] - space[4];
const PERSPECTIVE = 1200;

type Props = {
  card: ReviewCard;
  role: CardRole;
  flipped: boolean;
  // Days until this card comes back after Easy, from the server; null while not known.
  easyDays: number | null;
  // Set when the card leaves by a button, not by a swipe: it flies off by itself.
  sentOff?: Direction | null;
  lead: SharedValue<number>;
  onFlip(): void;
  onSwipe(direction: Direction): void;
  onUseIt(): void;
};

// The word card (Figma: Flashcard, Flashcard · back, Flashcard · rules). Picture on top, the word under it,
// the same on both sides. A tap flips it; a drag moves it, with the label of that direction growing on it.
export const Flashcard = memo(function Flashcard({ card, role, flipped, easyDays, sentOff = null, lead, onFlip, onSwipe, onUseIt }: Props) {
  const top = role === 'top';
  const { pan, cardStyle, labelStyles, flyFromButton, wasDrag } = useSwipe({ enabled: top, lead, onSwipe });
  // A tap, unless the finger dragged the card on its way.
  const tap = (action: () => void) => () => {
    if (!wasDrag()) action();
  };

  // Left by a button: fly off now. (A swiped card is already flying; `flyOff` does nothing then.)
  useEffect(() => {
    if (role === 'leaving' && sentOff) flyFromButton(sentOff);
  }, [role, sentOff, flyFromButton]);

  // The card under the top one is a little smaller and rises as the top one is dragged away.
  const risen = useSharedValue(role === 'under' ? 0 : 1);
  const follows = useSharedValue(role === 'under' ? 1 : 0);
  useEffect(() => {
    if (role === 'under') return;
    // Now the top card: go on from where the drag left it, in one step on the UI thread, so nothing jumps.
    scheduleOnUI(() => {
      'worklet';
      if (!follows.get()) return;
      risen.set(Math.max(risen.get(), lead.get()));
      follows.set(0);
      lead.set(0);
      risen.set(withTiming(1, { duration: 160 }));
    });
  }, [role, follows, risen, lead]);
  const riseStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(Math.max(risen.get(), follows.get() * lead.get()), [0, 1], [UNDER_SCALE, 1]) }] }));

  // The flip: the whole card turns around its vertical middle; the sides swap at the half turn.
  const turn = useSharedValue(flipped ? 1 : 0);
  useEffect(() => {
    turn.set(withTiming(flipped ? 1 : 0, { duration: tokens.flipMs, easing: Easing.inOut(Easing.cubic) }));
  }, [flipped, turn]);
  // Each side turns by itself: the front to its edge in the first half, the back from its edge in the second.
  // A side that rests has no 3D transform at all: iOS draws a layer inside a 3D turn as a soft picture, so the back
  // (which used to rest at 180° + 180°) was blurry (found on Hamid's iPhone, 2026-11-24).
  const frontStyle = useAnimatedStyle(() => {
    const t = turn.get();
    return { opacity: t < 0.5 ? 1 : 0, transform: t <= 0 ? [{ rotateY: '0deg' }] : [{ perspective: PERSPECTIVE }, { rotateY: `${interpolate(t, [0, 0.5], [0, 90], 'clamp')}deg` }] };
  });
  const backStyle = useAnimatedStyle(() => {
    const t = turn.get();
    return { opacity: t < 0.5 ? 0 : 1, transform: t >= 1 ? [{ rotateY: '0deg' }] : [{ perspective: PERSPECTIVE }, { rotateY: `${interpolate(t, [0.5, 1], [-90, 0], 'clamp')}deg` }] };
  });
  const fit = wordLayout(card.word);

  const imageUrl = (card as ReviewCard & { imageUrl?: string | null }).imageUrl ?? null; // the picture field of the card API
  const bare = card.word.replace(/^\S+\s+/, ''); // the word without its article, to color it in the example
  const parts = card.example.split(bare);
  const say = tap(() => sayWord(card.word));
  // The voice is loaded when the first card shows, so the first tap on the speaker does not start late.
  useEffect(() => {
    if (top) warmUpSpeech();
  }, [top]);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]} pointerEvents={top ? 'auto' : 'none'} {...unread(!top)}>
        <Animated.View style={[styles.inner, riseStyle]}>
          <Pressable testID={top ? 'review-card' : undefined} accessible={false} onPress={tap(onFlip)} style={styles.fill}>
            <View style={styles.fill}>
              <Face testID="card-front" style={frontStyle} shown={!flipped}>
                <Picture url={imageUrl} share={tokens.pictureFront} />
                <View style={styles.frontBody}>
                  <View style={styles.frontWord}>
                    <Word card={card} />
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Say the word" onPress={say} style={({ pressed }) => [styles.speaker, styles.speakerFront, pressed && styles.speakerPressed]}>
                    <Icon name="speaker" color={colors.text2} />
                  </Pressable>
                  <View style={styles.frontRest} />
                  <Text style={[type.label, styles.muted]}>TAP TO FLIP</Text>
                </View>
              </Face>

              <Face testID="card-back" style={backStyle} shown={flipped}>
                <Picture url={imageUrl} share={tokens.pictureBack} gives />
                <View style={styles.backBody}>
                  <View style={styles.head}>
                    <Word card={card} />
                    {/* Higher levels read the meaning in the language they learn (Figma O12c); others the translation. */}
                    <Text style={[type.headline, styles.text2, styles.center]}>{card.meaning ?? card.translation}</Text>
                  </View>
                  <View style={styles.rule} />
                  <View style={styles.example}>
                    <Text accessibilityLabel={card.example} style={[type.body, styles.ink]}>
                      {parts.map((part, i) => (
                        <Text key={i}>
                          {part}
                          {i < parts.length - 1 ? <Text style={[type.bodyStrong, styles.green]}>{bare}</Text> : null}
                        </Text>
                      ))}
                    </Text>
                    <Text style={[type.callout, styles.muted]}>{card.exampleTranslation}</Text>
                  </View>
                  <View style={styles.grow} />
                  {/* The server says when Use it is offered (from level 3, and on the first day). */}
                  {card.canUseIt ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Use it" onPress={tap(onUseIt)} style={styles.useIt}>
                      <Icon name="mic" color={colors.white} />
                      <Text style={[type.button, styles.white]}>Use it</Text>
                    </Pressable>
                  ) : null}
                  {/* A fixed place beside the first line, outside the word row: a long word can never push it off the card. */}
                  <Pressable accessibilityRole="button" accessibilityLabel="Say the word" onPress={say} style={({ pressed }) => [styles.speaker, styles.speakerBack, { top: BACK_BODY_TOP + WORD_ROW_TOP + (fit.size + tokens.wordLineGap - tokens.speakerBack) / 2 }, pressed && styles.speakerPressed]}>
                    <Icon name="speaker" color={colors.text2} />
                  </Pressable>
                </View>
              </Face>
            </View>
          </Pressable>

          {/* The swipe labels (Figma: Stamp). They are a picture of the drag: opacity follows the finger. */}
          {role === 'under' ? null : (
          <View style={styles.stamps} pointerEvents="none" {...UNREAD}>
            <Stamp testID="stamp-easy" style={labelStyles.easy} title="EASY" note={easyDays === null ? null : `BACK IN ${easyDays} ${easyDays === 1 ? 'DAY' : 'DAYS'}`} color={colors.easy} />
            <Stamp testID="stamp-hard" style={labelStyles.hard} title="HARD" note="GOES TO YOUR LOCK SCREEN" color={colors.hard} />
            <Stamp testID="stamp-known" style={labelStyles.known} title="KNOW IT" note="WON’T SHOW AGAIN" color={colors.know} filled />
          </View>
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

// One side of the card. The side that is turned away cannot be read or touched.
function Face({ testID, style, shown, children }: { testID: string; style: StyleProp<AnimatedStyle<ViewStyle>>; shown: boolean; children: ReactNode }) {
  return (
    <Animated.View testID={testID} style={[styles.face, style]} pointerEvents={shown ? 'auto' : 'none'} {...unread(!shown)}>
      <View style={styles.clip}>{children}</View>
    </Animated.View>
  );
}

// The top of the card, on both sides: the word's picture, or a quiet placeholder while there is none.
// `gives` (the back): when the text under it needs more room than is left, the picture gets shorter, so the Use it
// button is never pushed off the card (a small phone, a long meaning and example).
function Picture({ url, share, gives = false }: { url: string | null; share: `${number}%`; gives?: boolean }) {
  return (
    <View testID="card-picture" style={[styles.picture, { height: share }, gives && styles.pictureGives]}>
      {url ? (
        <Image testID="card-image" source={{ uri: url }} contentFit="cover" transition={150} style={styles.fill} accessibilityElementsHidden />
      ) : (
        <View testID="card-picture-placeholder" style={styles.placeholder}>
          <Icon name="image" size={24} color={colors.subtle} />
        </View>
      )}
    </View>
  );
}

// The word with its level square, centered. The square sits on the first line. One or two lines, never three;
// a word is never cut: the font gets smaller instead (src/review/word-size.ts).
function Word({ card }: { card: ReviewCard }) {
  const { size, lines } = wordLayout(card.word);
  return (
    <View style={styles.wordRow}>
      <View style={[styles.square, { marginTop: (size + tokens.wordLineGap - tokens.levelSquare) / 2, backgroundColor: levelColors[card.stage] ?? levelColors[0] }]} />
      <Text accessibilityLabel={card.word} numberOfLines={lines.length} adjustsFontSizeToFit minimumFontScale={0.5} style={[type.wordXL, styles.word, { fontSize: size, lineHeight: size + tokens.wordLineGap }]}>
        {lines.join('\n')}
      </Text>
    </View>
  );
}

function Stamp({ testID, style, title, note, color, filled = false }: { testID: string; style: StyleProp<AnimatedStyle<ViewStyle>>; title: string; note: string | null; color: string; filled?: boolean }) {
  return (
    <Animated.View testID={testID} style={[styles.stampBox, style]}>
      {/* The note sits inside the frame, on the frame's own background, so it reads on any picture (Hamid, 2026-11-24). */}
      <View style={[styles.stamp, { borderColor: color }, filled && { backgroundColor: color }]}>
        <Text style={[type.stamp, { color: filled ? colors.white : color }]}>{title}</Text>
        {note ? <Text style={[type.label, { color: filled ? colors.white : color === colors.easy ? colors.greenText : color }]}>{note}</Text> : null}
      </View>
    </Animated.View>
  );
}

const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

const styles = StyleSheet.create({
  fill: { ...FILL },
  // The card takes the finger from the whole width of the screen, also from the margins beside it: a swipe often
  // starts at the screen edge.
  card: { ...FILL, left: -layout.sideMargin, right: -layout.sideMargin },
  inner: { ...FILL, left: layout.sideMargin, right: layout.sideMargin },
  // The shadow sits on each side (a view that clips its content cannot also cast a shadow).
  face: { ...FILL, borderRadius: radius.card, backgroundColor: colors.surface, ...lift, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  clip: { flex: 1, borderRadius: radius.card, overflow: 'hidden' },
  picture: { backgroundColor: colors.canvas, borderBottomWidth: 1, borderBottomColor: colors.divider },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frontBody: { flex: 1, alignItems: 'center', paddingHorizontal: space[24] - space[4], paddingBottom: space[24] },
  frontWord: { flex: 3, justifyContent: 'flex-end', paddingTop: space[16] },
  frontRest: { flex: 2 },
  pictureGives: { flexShrink: 1, minHeight: '20%' },
  // As tall as its text needs, and it takes the room that is left: the picture gives way, the text does not.
  backBody: { flexGrow: 1, flexShrink: 0, gap: space[16], paddingHorizontal: space[24] - space[4], paddingTop: BACK_BODY_TOP, paddingBottom: space[24] },
  head: { alignItems: 'center', gap: space[4] },
  example: { gap: space[8] - 2 },
  wordRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: space[12], paddingTop: WORD_ROW_TOP },
  word: { color: colors.text, textAlign: 'center', maxWidth: tokens.wordMaxWidth },
  square: { width: tokens.levelSquare, height: tokens.levelSquare, borderRadius: 3, borderWidth: 1, borderColor: colors.divider },
  speaker: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip },
  speakerPressed: { backgroundColor: colors.line }, // darker while the finger is on it, so a tap is felt
  speakerFront: { width: tokens.speakerFront, height: tokens.speakerFront, marginTop: space[24] - space[4] },
  speakerBack: { position: 'absolute', right: tokens.speakerInset, width: tokens.speakerBack, height: tokens.speakerBack },
  grow: { flex: 1 },
  center: { textAlign: 'center' },
  ink: { color: colors.text },
  text2: { color: colors.text2 },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  white: { color: colors.white },
  rule: { height: 1, backgroundColor: colors.divider },
  useIt: { alignSelf: 'center', height: 44, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[24], borderRadius: radius.pill, backgroundColor: colors.button },
  stamps: { ...FILL },
  stampBox: { position: 'absolute', top: tokens.stampTop, left: 0, right: 0, alignItems: 'center', gap: space[8], transform: [{ rotate: '-6deg' }] },
  stamp: { alignItems: 'center', gap: space[4], paddingHorizontal: space[24] - space[4], paddingVertical: space[12], borderRadius: radius.badge, borderWidth: 3, backgroundColor: colors.surface },
});
