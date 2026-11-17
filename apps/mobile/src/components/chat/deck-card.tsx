import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Deck } from '@/api/client';
import { Icon } from '@/components/icon';
import { colors, levelColors, radius, space, type } from '@/theme/theme';

type Props = { deck: Deck; state: 'proposed' | 'generating' | 'ready'; onGenerate(): void; onOpen(): void };

// Figma deck card in a Kai chat: proposed (Generate) → generating (progress) → ready (tap to open).
export function DeckCard({ deck, state, onGenerate, onOpen }: Props) {
  const body = (
    <>
      <View style={styles.row}>
        <Text style={[type.labelTag, styles.muted]}>{`${deck.cefr} · ${deck.wordCount} WORDS`}</Text>
        {state === 'ready' ? <Text style={[type.labelTag, styles.green]}>JUST NOW</Text> : null}
      </View>
      <Text style={[type.bodyStrong, styles.title]}>{`“${deck.title}”`}</Text>
      {state === 'proposed' ? (
        <View style={styles.row}>
          <Text style={[type.caption, styles.muted]}>{deck.reason}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Generate" onPress={onGenerate} style={styles.generate}>
            <Icon name="generate" color={colors.text} />
            <Text style={[type.calloutMedium, styles.ink]}>Generate</Text>
          </Pressable>
        </View>
      ) : state === 'generating' ? (
        <Making total={deck.wordCount} />
      ) : (
        <View style={styles.readyRows}>
          <View style={styles.squares}>
            {deck.cards.map((card) => (
              <View key={card.id} style={[styles.square, { backgroundColor: levelColors[card.stage] ?? levelColors[0] }]} />
            ))}
          </View>
          <Text style={[type.labelTag, styles.muted]}>{`${deck.wordCount} WORDS · ADDED TO YOUR DECKS`}</Text>
        </View>
      )}
    </>
  );
  return state === 'ready' ? (
    <Pressable accessibilityRole="button" accessibilityLabel="Open deck" onPress={onOpen} style={styles.card}>
      {body}
    </Pressable>
  ) : (
    <View style={[styles.card, state === 'generating' && styles.cardBusy]}>{body}</View>
  );
}

// A timed count: the server's job reports no progress, only generating → ready.
function Making({ total }: { total: number }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    const timer = setInterval(() => setN((v) => Math.min(v + 1, total - 1)), 700);
    return () => clearInterval(timer);
  }, [total]);
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
  card: { alignSelf: 'stretch', marginRight: 24, padding: space[16], gap: space[12], borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  cardBusy: { borderColor: levelColors[3] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[8] },
  title: { color: colors.text, marginRight: space[48] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  generate: { height: 36, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[12], borderRadius: radius.badge, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  readyRows: { gap: space[8] },
  squares: { flexDirection: 'row', gap: 2 },
  square: { width: 10, height: 10, borderRadius: 2 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.divider, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.button },
});
