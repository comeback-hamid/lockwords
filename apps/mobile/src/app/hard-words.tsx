import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/auth/boot';
import { directionStyle } from '@/components/chat/direction';
import { Icon } from '@/components/icon';
import { LoadError, Loading } from '@/components/load-state';
import { useLoad } from '@/components/use-load';
import { savesDone } from '@/review/saver';
import { colors, layout, radius, space, type } from '@/theme/theme';

// Hard words (Figma P2): every word swiped Hard that is not back at level 3 yet. Opened from the Progress tab.
export default function HardWordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const load = useCallback(() => savesDone().then(() => api.fetchHardWords()), []); // after every swipe is saved
  const { data: words, failed, retry } = useLoad(load);
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.tap}>
          <Icon name="back" size={24} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[24] }]}>
        {failed ? (
          <LoadError message="Could not load your hard words." onRetry={retry} />
        ) : !words ? (
          <Loading label="Loading your hard words…" />
        ) : (
          <>
            <View style={styles.head}>
              <Text accessibilityRole="header" style={[type.title, styles.ink]}>
                Hard words
              </Text>
              <Text style={[type.label, styles.muted]}>{`${words.length} ${words.length === 1 ? 'WORD' : 'WORDS'} · ON YOUR LOCK SCREEN`}</Text>
            </View>
            {words.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[type.bodyStrong, styles.ink]}>No hard words.</Text>
                <Text style={[type.callout, styles.muted]}>Swipe a word left in Review and it shows here.</Text>
              </View>
            ) : (
              <View style={styles.box}>
                {words.map((w, i) => (
                  // The label says what the row shows (a screen reader, and Maestro, read the label).
                  <View key={`${w.word}-${i}`} accessible accessibilityLabel={`${w.word}, ${w.translation}`} style={[styles.row, i < words.length - 1 && styles.divider]}>
                    <View style={styles.dot} />
                    <Text style={[type.body, styles.ink, styles.word, directionStyle(w.word)]}>{w.word}</Text>
                    <Text style={[type.callout, styles.muted, styles.translation, directionStyle(w.translation)]} numberOfLines={1}>
                      {w.translation}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  topBar: { height: layout.minTapTarget, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center' },
  tap: { width: layout.minTapTarget, height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: layout.sideMargin, paddingTop: space[24], gap: space[24] },
  head: { gap: space[8] },
  empty: { gap: space[4] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { minHeight: layout.minTapTarget, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16], paddingVertical: space[8] },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.hard },
  word: { flex: 1 },
  translation: { flexShrink: 1, maxWidth: '50%' },
});
