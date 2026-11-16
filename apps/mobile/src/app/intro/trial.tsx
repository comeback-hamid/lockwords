import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ButtonPrimary } from '@/components/button';
import { colors, layout, levelColors, radius, space, type } from '@/theme/theme';

const ROWS = [
  { when: 'TODAY', what: 'Full access, free', color: levelColors[3] },
  { when: 'DAY 5', what: 'We email you a reminder', color: levelColors[2] },
  { when: 'DAY 7', what: 'Trial ends. Cancel in 2 taps', color: levelColors[1] },
] as const;

// O15 Trial reminder. shortcut: Kai stands in for the Figma people picture (not in the repo).
export default function TrialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[32], paddingBottom: Math.max(insets.bottom, space[16]) }]}>
      <View style={styles.content}>
        <Image source={require('../../../assets/kai/kai-celebrate.svg')} style={styles.kai} contentFit="contain" accessibilityLabel="Kai" />
        <Text accessibilityRole="header" style={[type.title, styles.ink]}>
          We’ll remind you before your trial ends
        </Text>
        <View style={styles.box}>
          {ROWS.map((row, i) => (
            <View key={row.when} style={[styles.row, i < ROWS.length - 1 && styles.divider]}>
              <View style={[styles.square, { backgroundColor: row.color }]} />
              <Text style={[type.labelTag, styles.muted, styles.when]}>{row.when}</Text>
              <Text style={[type.calloutMedium, styles.ink]}>{row.what}</Text>
            </View>
          ))}
        </View>
        <Text style={[type.caption, styles.muted]}>No charge today.</Text>
      </View>
      <ButtonPrimary label="Continue" onPress={() => router.push('/intro/paywall')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: layout.sideMargin },
  content: { flex: 1, gap: space[24] },
  kai: { alignSelf: 'center', width: 196, height: 140 },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16] },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  square: { width: 12, height: 12, borderRadius: 3 },
  when: { width: 52 },
});
