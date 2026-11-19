import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Deck } from '@/api/client';
import { Icon } from '@/components/icon';
import { colors, levelColors, opacity, radius, space, type } from '@/theme/theme';

// What the card needs of a deck. A full deck fits, and so does a deck idea in the New words chat (no cards yet).
export type CardDeck = Pick<Deck, 'cefr' | 'wordCount' | 'title' | 'reason'> & { titleTranslation?: string | null; cards?: Pick<Deck['cards'][number], 'id' | 'stage'>[] };

type Props = {
  deck: CardDeck;
  state: 'proposed' | 'generating' | 'ready' | 'disabled'; // disabled: an older idea, grayed, not tappable
  onGenerate(): void;
  onOpen(): void;
  count?: number;
  hideGenerate?: boolean; // Kai is still typing; Generate keeps its place (no jump) but cannot be seen or tapped yet
  showTranslation?: boolean; // the title in the learner's own language, under the title (New words: follows the translation button)
  inWordList?: boolean; // New words: the deck is in the word list at once, so the ready card says so
  flat?: boolean; // in a row of cards: no room kept on the right
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

// Figma deck card in a Kai chat: proposed (Generate) → generating (progress) → ready (tap to open).
export function DeckCard({ deck, state, onGenerate, onOpen, count, hideGenerate = false, showTranslation = false, inWordList = false, flat = false }: Props) {
  // One level square per word. An idea has no cards yet: every word is new.
  const squares = deck.cards?.length ? deck.cards : Array.from({ length: deck.wordCount }, (_, i) => ({ id: String(i), stage: 0 }));
  const body = (
    <>
      <View style={styles.row}>
        <Text style={[type.labelTag, styles.muted]}>{`${deck.cefr} · ${deck.wordCount} WORDS`}</Text>
        {state === 'ready' ? <Text style={[type.labelTag, styles.green]}>JUST NOW</Text> : null}
      </View>
      <View>
        <Text style={[type.bodyStrong, styles.title]}>{`“${deck.title}”`}</Text>
        {showTranslation && deck.titleTranslation ? (
          <Text testID="deck-title-translation" style={[type.caption, styles.muted, styles.translation]}>
            {deck.titleTranslation}
          </Text>
        ) : null}
      </View>
      {state === 'disabled' ? (
        <Text style={[type.caption, styles.muted]}>{deck.reason}</Text>
      ) : state === 'proposed' ? (
        <View style={styles.row}>
          <Text style={[type.caption, styles.muted]}>{deck.reason}</Text>
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
    <Pressable accessibilityRole="button" accessibilityLabel="Open deck" onPress={onOpen} style={[styles.card, flat && styles.flat]}>
      {body}
    </Pressable>
  ) : (
    <View style={[styles.card, flat && styles.flat, state === 'generating' && styles.cardBusy, state === 'disabled' && styles.disabled]}>{body}</View>
  );
}

function Making({ total, count }: { total: number; count?: number }) {
  const own = useTimedCount(count === undefined, total);
  const n = count ?? own;
  return (
    <View style={styles.readyRows}>
      <View style={styles.row}>
        <Text style={[type.calloutMedium, styles.ink]}>Making your deck…</Text>
        <Text style={[type.labelTag, styles.muted]}>{`${n} / ${total} WORDS`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(n / total) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  card: { alignSelf: 'stretch', marginRight: 24, padding: space[16], gap: space[12], borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  cardBusy: { borderColor: levelColors[3] },
  flat: { marginRight: 0 },
  disabled: { opacity: opacity.disabled },
  translation: { marginTop: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  title: { color: colors.text, marginRight: space[48] },
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
