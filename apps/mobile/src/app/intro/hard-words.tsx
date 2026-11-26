import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LangText } from '@/components/lang-text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/auth/boot';
import { ButtonPrimary } from '@/components/button';
import { LoadError } from '@/components/load-state';
import { LockPhone } from '@/components/lock-phone';
import { useLoad } from '@/components/use-load';
import { Kai } from '@/kai/kai';
import { getRound } from '@/review/round-store';
import { colors, layout, radius, space, type } from '@/theme/theme';
import { widgetHowTo } from '@/widgets/how-to';

// O14: after the first round, show where hard words go.
export default function HardWordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const load = useCallback(() => api.fetchHardWords(), []);
  const { data, failed, retry } = useLoad(load);
  const words = data ?? [];
  // The phone shows a hard word. With none (or while they load): a word of the round the learner just finished,
  // so it is always in the language they learn.
  const shown = words[0] ?? getRound().cards[0] ?? { word: 'la cuenta', translation: 'the bill' };
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[24], paddingBottom: Math.max(insets.bottom, space[16]) }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={[type.title, styles.ink, styles.title]}>
            Hard words go to your lock screen
          </Text>
          <Kai size={84} />
        </View>
        <LockPhone word={shown.word} translation={shown.translation} highlight />
        <Text style={[type.callout, styles.muted, styles.how]}>{widgetHowTo()}</Text>
        {failed ? <LoadError message="Could not load your hard words." onRetry={retry} /> : null}
        {words.length ? (
          <View style={styles.group}>
            <Text style={[type.label, styles.muted]}>{`YOUR HARD WORDS · ${words.length}`}</Text>
            <View style={styles.box}>
              {words.slice(0, 5).map((w, i, list) => (
                <View key={w.word} style={[styles.row, i < list.length - 1 && styles.divider]}>
                  <LangText style={[type.body, styles.ink, styles.word]}>{w.word}</LangText>
                  <LangText style={[type.callout, styles.muted]}>{w.translation}</LangText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <ButtonPrimary label="Continue" onPress={() => router.push('/intro/trial')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: layout.sideMargin },
  content: { gap: space[24], paddingBottom: space[24] },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  title: { flex: 1 },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  how: { textAlign: 'center' },
  group: { gap: space[8] },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { height: 44, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16] },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  word: { flex: 1 },
});
