import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { ChatDeck } from '@/api/client';
import { DeckCard } from '@/components/chat/deck-card';
import { colors, layout, space } from '@/theme/theme';

type Props = {
  decks: ChatDeck[]; // the decks of one Kai line: 3 ideas of Kai's, or 1 from the learner's own idea
  showTranslation: boolean;
  making: string | null; // the id of the deck being made now (any row)
  locked: boolean; // Generate cannot be tapped: Kai is typing, or a deck is being made
  count?: number; // words made so far, shared with Kai's `making` state
  drawing?: { id: string; ready: number; total: number } | null; // the deck whose pictures are being drawn now
  onGenerate(deck: ChatDeck): void;
  onOpen(deck: ChatDeck): void;
};

// A card is as wide as the screen less this much on each side, so the next card peeks in.
const PEEK = space[32];
const GAP = space[8];
export const ideaStep = (screenWidth: number) => screenWidth - 2 * PEEK + GAP; // from one card to the next

// Figma N2–N5: the deck cards under a Kai line. Three show in a row the learner swipes sideways, with page dots.
// One shows alone. Once a deck of the row is being made or is made, only that card shows.
export function DeckIdeas({ decks, showTranslation, making, locked, count, drawing, onGenerate, onOpen }: Props) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const stateOf = (d: ChatDeck) => (d.id === making || d.status === 'generating' ? 'generating' : d.id === drawing?.id ? 'drawing' : d.status === 'ready' ? 'ready' : d.current ? 'proposed' : 'disabled');
  const chosen = decks.filter((d) => ['generating', 'drawing', 'ready'].includes(stateOf(d)));
  const shown = chosen.length ? chosen : decks;
  const card = (d: ChatDeck, flat: boolean) => (
    <DeckCard deck={d} state={stateOf(d)} count={count} pictures={drawing?.id === d.id ? drawing : undefined} hideGenerate={locked} showTranslation={showTranslation} inWordList flat={flat} onGenerate={() => onGenerate(d)} onOpen={() => onOpen(d)} />
  );
  if (shown.length === 1) return card(shown[0]!, false);

  const step = ideaStep(width);
  return (
    <View style={styles.bleed}>
      <ScrollView
        testID="deck-ideas-row"
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={(e) => setPage(Math.max(0, Math.min(shown.length - 1, Math.round(e.nativeEvent.contentOffset.x / step))))}
        contentContainerStyle={styles.row}
      >
        {shown.map((d) => (
          <View key={d.id} style={{ width: step - GAP }}>
            {card(d, true)}
          </View>
        ))}
      </ScrollView>
      <View accessible accessibilityLabel={`Deck ${page + 1} of ${shown.length}`} style={styles.dots}>
        {shown.map((d, i) => (
          <View key={d.id} testID="deck-dot" style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The row goes from screen edge to screen edge, past the chat's side margin.
  bleed: { marginHorizontal: -layout.sideMargin, gap: space[8] },
  row: { paddingHorizontal: PEEK, gap: GAP, alignItems: 'stretch' },
  dots: { flexDirection: 'row', alignSelf: 'center', gap: space[4], padding: space[4] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.muted },
});
