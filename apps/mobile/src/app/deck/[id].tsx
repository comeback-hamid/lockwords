import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/auth/boot';
import { Icon } from '@/components/icon';
import { LoadError, Loading } from '@/components/load-state';
import { useLoad } from '@/components/use-load';
import { colors, layout, levelColors, radius, space, type } from '@/theme/theme';

// A deck's words. shortcut: a plain list; the real deck page (Figma N7 / P3: pictures, swipe to delete) comes with the decks epic.
export default function DeckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => api.fetchDeck(id), [id]);
  const { data: deck, failed, retry } = useLoad(load);
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.replace('/(tabs)')} style={styles.close}>
          <Icon name="close" size={24} color={colors.text} />
        </Pressable>
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
              <Text style={[type.label, styles.muted]}>{`${deck.cefr} · ${deck.cards.length} WORDS`}</Text>
            </View>
            <View style={styles.box}>
              {deck.cards.map((card, i) => (
                <View key={card.id} style={[styles.row, i < deck.cards.length - 1 && styles.divider]}>
                  <View style={[styles.square, { backgroundColor: levelColors[card.stage] ?? levelColors[0] }]} />
                  <Text style={[type.bodyStrong, styles.ink, styles.word]}>{card.word}</Text>
                  <Text style={[type.callout, styles.muted]}>{card.translation}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  topBar: { height: 44, paddingLeft: 2 },
  close: { width: layout.minTapTarget, height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: layout.sideMargin, paddingTop: space[24], gap: space[24] },
  head: { gap: space[8] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16] },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  square: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: colors.divider },
  word: { flex: 1 },
});
