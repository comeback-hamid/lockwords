import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/auth/boot';
import { ButtonPrimary } from '@/components/button';
import { LockPhone } from '@/components/lock-phone';
import { useLoad } from '@/components/use-load';
import { colors, layout, radius, space, type } from '@/theme/theme';

// O14: after the first round, show where hard words go.
export default function HardWordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const load = useCallback(() => api.fetchHardWords(), []);
  const { data } = useLoad(load);
  const words = data ?? [];
  const shown = words[0] ?? { word: 'la cuenta', translation: 'the bill' };
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[24], paddingBottom: Math.max(insets.bottom, space[16]) }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={[type.title, styles.ink, styles.title]}>
            Hard words go to your lock screen
          </Text>
          <Image source={require('../../../assets/kai/kai-idle.svg')} style={styles.kai} contentFit="contain" accessibilityLabel="Kai" />
        </View>
        <LockPhone word={shown.word} translation={shown.translation} highlight />
        {words.length ? (
          <View style={styles.group}>
            <Text style={[type.label, styles.muted]}>{`YOUR HARD WORDS · ${words.length}`}</Text>
            <View style={styles.box}>
              {words.slice(0, 5).map((w, i, list) => (
                <View key={w.word} style={[styles.row, i < list.length - 1 && styles.divider]}>
                  <View style={styles.dot} />
                  <Text style={[type.body, styles.ink, styles.word]}>{w.word}</Text>
                  <Text style={[type.callout, styles.muted]}>{w.translation}</Text>
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
  kai: { width: 72, height: 52 },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  group: { gap: space[8] },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { height: 44, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16] },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.hard },
  word: { flex: 1 },
});
