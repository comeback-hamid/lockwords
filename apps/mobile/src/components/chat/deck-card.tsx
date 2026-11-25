import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Deck } from '@/api/client';
import { LangText } from '@/components/lang-text';
import { Icon } from '@/components/icon';
import { colors, levelColors, opacity, radius, space, type } from '@/theme/theme';

import { directionStyle, isRtl } from './direction';

// What the card needs of a deck. A full deck fits, and so does a deck idea in the New words chat (no cards yet).
export type CardDeck = Pick<Deck, 'cefr' | 'wordCount' | 'title' | 'reason'> & { titleTranslation?: string | null; cards?: Pick<Deck['cards'][number], 'id' | 'stage'>[] };
// How far the deck's pictures are: `ready` of `total` cards have theirs. `startedAt` (a clock time in ms) is when the
// drawing began: the bar is timed from it. `done` = the picture run has really ended.
export type PictureCount = { ready: number; total: number; startedAt?: number; done?: boolean };

// One picture sheet arrives all at once, so the bar is timed (Hamid, 2026-11-23): it fills to 90 % over the time a sheet
// usually takes, waits there, and goes to 100 % the moment the pictures are really done. A real sheet that arrives
// (several sheets) moves it forward. It is worked out from `startedAt`, so a card that is drawn again keeps its place.
export const PICTURES_EXPECTED_MS = 20_000; // real sheets took 21 to 28 s (2026-11-23)
const TIMED_TOP = 0.9;
const NOT_DONE_TOP = 0.97; // every real picture is in, but the run has not said "done" yet
export function pictureProgress(now: number, p: PictureCount): number {
  if (p.done) return 1;
  const timed = p.startedAt === undefined ? 0 : Math.min(TIMED_TOP, (Math.max(0, now - p.startedAt) / PICTURES_EXPECTED_MS) * TIMED_TOP);
  const real = p.total ? p.ready / p.total : 0;
  return Math.min(NOT_DONE_TOP, Math.max(timed, real));
}

type Props = {
  deck: CardDeck;
  // drawing: the words are made and the pictures are being drawn (not tappable yet). disabled: an older idea, grayed, not tappable.
  state: 'proposed' | 'generating' | 'drawing' | 'ready' | 'disabled';
  pictures?: PictureCount; // drawing: how many pictures are ready
  onGenerate(): void;
  onOpen(): void;
  count?: number;
  hideGenerate?: boolean; // Kai is still typing; Generate keeps its place (no jump) but cannot be seen or tapped yet
  showTranslation?: boolean; // the title in the learner's own language, under the title (New words: follows the translation button)
  inWordList?: boolean; // New words: the deck is in the word list at once, so the ready card says so
  flat?: boolean; // in a row of cards: no room kept on the right
  listed?: boolean; // in a list of the learner's decks (Progress): no JUST NOW, and the button is named after the deck ("Open deck, <title>")
};

// A timed count: the server's job reports no progress, only generating → ready.
// One word about every 1.6 s, never past N − 1; the screen shares it with Kai's `making`.
export const WORD_MS = 1600;
export function useTimedCount(active: boolean, total: number) {
  const [n, setN] = useState(1);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const timer = setInterval(() => setN(Math.min(Math.max(1, Math.floor((Date.now() - start) / WORD_MS)), total - 1)), 200);
    return () => {
      clearInterval(timer);
      setN(1);
    };
  }, [active, total]);
  return n;
}

// Figma deck card in a Kai chat: proposed (Generate) → generating (progress) → drawing (pictures) → ready (tap to open).
// A card that can be opened has the open column on its right (Figma "Deck card / Open column"): a narrow grey strip,
// as high as the card, with a small arrow in the middle. It is the one deck card: chat, onboarding and Progress use it.
export function DeckCard({ deck, state, onGenerate, onOpen, count, pictures, hideGenerate = false, showTranslation = false, inWordList = false, flat = false, listed = false }: Props) {
  // One level square per word. An idea has no cards yet: every word is new.
  const squares = deck.cards?.length ? deck.cards : Array.from({ length: deck.wordCount }, (_, i) => ({ id: String(i), stage: 0 }));
  const body = (
    <>
      <View style={styles.row}>
        <Text style={[type.labelTag, styles.muted]}>{`${deck.cefr} · ${deck.wordCount} WORDS`}</Text>
        {state === 'ready' && !listed ? <Text style={[type.labelTag, styles.green]}>JUST NOW</Text> : null}
      </View>
      <View>
        <LangText style={[type.bodyStrong, styles.title, isRtl(deck.title) && styles.titleRtl, directionStyle(deck.title)]}>{`“${deck.title}”`}</LangText>
        {showTranslation && deck.titleTranslation ? (
          <LangText testID="deck-title-translation" style={[type.caption, styles.muted, styles.translation, directionStyle(deck.titleTranslation)]}>
            {deck.titleTranslation}
          </LangText>
        ) : null}
      </View>
      {state === 'disabled' ? (
        <LangText style={[type.caption, styles.muted, directionStyle(deck.reason)]}>{deck.reason}</LangText>
      ) : state === 'proposed' ? (
        <View style={styles.row}>
          <LangText style={[type.caption, styles.muted, directionStyle(deck.reason)]}>{deck.reason}</LangText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate"
            onPress={onGenerate}
            disabled={hideGenerate}
            accessibilityElementsHidden={hideGenerate}
            importantForAccessibility={hideGenerate ? 'no-hide-descendants' : 'auto'}
            style={[styles.generate, hideGenerate && styles.hidden]}
          >
            <Icon name="generate" color={colors.text} />
            <Text style={[type.calloutMedium, styles.ink]}>Generate</Text>
          </Pressable>
        </View>
      ) : state === 'generating' ? (
        <Making total={deck.wordCount} count={count} />
      ) : state === 'drawing' ? (
        <PictureProgress pictures={pictures ?? { ready: 0, total: deck.wordCount }} />
      ) : (
        <View style={styles.readyRows}>
          <View style={styles.squares}>
            {squares.map((card) => (
              <View key={card.id} testID="level-square" style={[styles.square, { backgroundColor: levelColors[card.stage] ?? levelColors[0] }]} />
            ))}
          </View>
          <Text style={[type.labelTag, styles.muted]}>{`${deck.wordCount} WORDS · ${inWordList ? 'IN YOUR WORD LIST' : 'ADDED TO YOUR DECKS'}`}</Text>
        </View>
      )}
    </>
  );
  return state === 'ready' ? (
    <Pressable accessibilityRole="button" accessibilityLabel={listed ? `Open deck, ${deck.title}` : 'Open deck'} onPress={onOpen} style={[styles.card, styles.openCard, flat && styles.flat]}>
      <View style={styles.openBody}>{body}</View>
      <View testID="deck-open-column" style={styles.openColumn}>
        <Icon name="next" color={colors.muted} />
      </View>
    </Pressable>
  ) : (
    <View style={[styles.card, flat && styles.flat, (state === 'generating' || state === 'drawing') && styles.cardBusy, state === 'disabled' && styles.disabled]}>{body}</View>
  );
}

function Making({ total, count }: { total: number; count?: number }) {
  const own = useTimedCount(count === undefined, total);
  return <Progress label="Making your deck…" n={count ?? own} total={total} unit="WORDS" />;
}

// The pictures being drawn: the timed bar (see `pictureProgress`) and a count that follows it. The bar moves on the UI
// thread (a native-driven scale); the count is read from the clock twice a second. The full count shows only when done.
const COUNT_TICK_MS = 500;
const DONE_MS = 250;
function PictureProgress({ pictures }: { pictures: PictureCount }) {
  const { ready, total, startedAt, done } = pictures;
  const [now, setNow] = useState(() => Date.now());
  const [scale] = useState(() => new Animated.Value(pictureProgress(Date.now(), pictures)));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), COUNT_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const p = { ready, total, startedAt, done };
    if (done) {
      const end = Animated.timing(scale, { toValue: 1, duration: DONE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true });
      end.start();
      return () => end.stop();
    }
    const from = pictureProgress(Date.now(), p);
    scale.setValue(from); // a real sheet that arrived may have moved it forward
    if (startedAt === undefined || from >= TIMED_TOP) return;
    // From where it is now to 90 %, at the timed pace.
    const left = Math.max(0, startedAt + PICTURES_EXPECTED_MS - Date.now());
    const run = Animated.timing(scale, { toValue: TIMED_TOP, duration: left, easing: Easing.linear, useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [scale, ready, total, startedAt, done]);
  const fraction = pictureProgress(now, pictures);
  const n = done ? total : Math.min(Math.max(0, total - 1), Math.floor(fraction * total + 1e-6));
  return (
    <View style={styles.readyRows}>
      <View style={styles.row}>
        <Text style={[type.calloutMedium, styles.ink]}>Drawing the pictures…</Text>
        <Text style={[type.labelTag, styles.muted]}>{`${n} / ${total} PICTURES`}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View testID="picture-progress-fill" style={[styles.fill, styles.fillTimed, { transform: [{ scaleX: scale }] }]} />
      </View>
    </View>
  );
}

// A label, "n / total UNIT" and a bar: the words being made.
function Progress({ label, n, total, unit }: { label: string; n: number; total: number; unit: string }) {
  return (
    <View style={styles.readyRows}>
      <View style={styles.row}>
        <Text style={[type.calloutMedium, styles.ink]}>{label}</Text>
        <Text style={[type.labelTag, styles.muted]}>{`${n} / ${total} ${unit}`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${total ? (n / total) * 100 : 0}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  card: { alignSelf: 'stretch', marginRight: 24, padding: space[16], gap: space[12], borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  cardBusy: { borderColor: levelColors[3] },
  // A card that opens: the content on the left, the open column on the right, cut to the card's round corners.
  openCard: { flexDirection: 'row', padding: 0, gap: 0, overflow: 'hidden' },
  openBody: { flex: 1, padding: space[16], gap: space[12] },
  openColumn: { width: space[32], alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, borderLeftWidth: 1, borderLeftColor: colors.line },
  flat: { marginRight: 0 },
  disabled: { opacity: opacity.disabled },
  translation: { marginTop: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  title: { color: colors.text, marginRight: space[48] },
  titleRtl: { marginRight: 0, marginLeft: space[48] }, // each text is aligned by its own script
  ink: { color: colors.text },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  generate: { height: 36, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[12], borderRadius: radius.badge, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  readyRows: { gap: space[8] },
  squares: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  square: { width: 10, height: 10, borderRadius: 2 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.divider, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.button },
  fillTimed: { width: '100%', transformOrigin: 'left' }, // full width, scaled from its left edge
});
