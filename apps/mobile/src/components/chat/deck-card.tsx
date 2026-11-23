import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Deck } from '@/api/client';
import { Icon } from '@/components/icon';
import { colors, levelColors, opacity, radius, space, type } from '@/theme/theme';

import { directionStyle, isRtl } from './direction';

// What the card needs of a deck. A full deck fits, and so does a deck idea in the New words chat (no cards yet).
export type CardDeck = Pick<Deck, 'cefr' | 'wordCount' | 'title' | 'reason'> & { titleTranslation?: string | null; cards?: Pick<Deck['cards'][number], 'id' | 'stage'>[] };
// How far the deck's pictures are: `ready` of `total` cards have theirs.
export type PictureCount = { ready: number; total: number };

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
        <Text style={[type.bodyStrong, styles.title, isRtl(deck.title) && styles.titleRtl, directionStyle(deck.title)]}>{`“${deck.title}”`}</Text>
        {showTranslation && deck.titleTranslation ? (
          <Text testID="deck-title-translation" style={[type.caption, styles.muted, styles.translation, directionStyle(deck.titleTranslation)]}>
            {deck.titleTranslation}
          </Text>
        ) : null}
      </View>
      {state === 'disabled' ? (
        <Text style={[type.caption, styles.muted, directionStyle(deck.reason)]}>{deck.reason}</Text>
      ) : state === 'proposed' ? (
        <View style={styles.row}>
          <Text style={[type.caption, styles.muted, directionStyle(deck.reason)]}>{deck.reason}</Text>
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
        <Progress label="Drawing the pictures…" n={pictures?.ready ?? 0} total={pictures?.total ?? deck.wordCount} unit="PICTURES" />
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

// A label, "n / total UNIT" and a bar: the words being made, then the pictures being drawn.
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
});
