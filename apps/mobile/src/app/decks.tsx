import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DeckSummary } from '@/api/client';
import { api } from '@/auth/boot';
import { Icon } from '@/components/icon';
import { LevelChain } from '@/components/level-chain';
import { LoadError, Loading } from '@/components/load-state';
import { useLoad } from '@/components/use-load';
import { colors, layout, radius, space, type } from '@/theme/theme';

const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

// Your decks (Figma P2): every deck with its words and how well they are known. Opened from the Progress tab.
export default function DecksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const load = useCallback(() => api.fetchDecks(), []);
  const { data: decks, failed, retry } = useLoad(load);
  const words = decks?.reduce((sum, d) => sum + d.words, 0) ?? 0;
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.tap}>
          <Icon name="back" size={24} color={colors.text} />
        </Pressable>
        {/* A new deck is made by talking to Kai: the New words tab. */}
        <Pressable accessibilityRole="button" accessibilityLabel="New deck" onPress={() => router.replace('/(tabs)')} style={styles.tap}>
          <Icon name="plus" size={24} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[24] }]}>
        {failed ? (
          <LoadError message="Could not load your decks." onRetry={retry} />
        ) : !decks ? (
          <Loading label="Loading your decks…" />
        ) : (
          <>
            <View style={styles.head}>
              <Text accessibilityRole="header" style={[type.title, styles.ink]}>
                Your decks
              </Text>
              <Text style={[type.label, styles.muted]}>{`${count(decks.length, 'deck')} · ${count(words, 'word')}`.toUpperCase()}</Text>
            </View>
            {decks.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[type.bodyStrong, styles.ink]}>No decks yet.</Text>
                <Text style={[type.callout, styles.muted]}>Ask Kai for one in New words.</Text>
              </View>
            ) : (
              <View style={styles.box}>
                {decks.map((deck, i) => (
                  <DeckRow key={deck.id} deck={deck} divider={i < decks.length - 1} onPress={() => router.push(`/deck/${deck.id}`)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function DeckRow({ deck, divider, onPress }: { deck: DeckSummary; divider: boolean; onPress(): void }) {
  const numbers = `${count(deck.words, 'word')} · ${deck.learning ? `${deck.learning} learning` : 'all new'}`;
  return (
    // The label says everything the row shows (a screen reader, and Maestro, read the label, not the texts inside).
    <Pressable accessibilityRole="button" accessibilityLabel={`${deck.topic}, ${numbers}`} onPress={onPress} style={[styles.row, divider && styles.divider]}>
      <View style={styles.icon}>
        <Icon name="deck" size={24} color={colors.greenText} />
      </View>
      <View style={styles.text}>
        <Text style={[type.bodyStrong, styles.ink]} numberOfLines={1}>
          {deck.topic}
        </Text>
        <Text style={[type.caption, styles.muted]}>{numbers}</Text>
        <View style={styles.chain}>
          <LevelChain stages={deck.stages} />
        </View>
      </View>
      <Icon name="next" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  topBar: { height: layout.minTapTarget, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tap: { width: layout.minTapTarget, height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: layout.sideMargin, paddingTop: space[24], gap: space[24] },
  head: { gap: space[8] },
  empty: { gap: space[4] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[12], padding: space[16] },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  icon: { width: 40, height: 40, borderRadius: radius.badge, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenBg },
  text: { flex: 1, gap: space[4] },
  chain: { alignItems: 'flex-start' },
});
