import { StyleSheet, Text, View } from 'react-native';

import { LangText } from '@/components/lang-text';
import { colors, levelColors, lift, radius, space, type } from '@/theme/theme';

// A drawn phone top with a lock-screen word card (O2 Welcome, O14 Hard words).
export function LockPhone({ word, translation, highlight = false, height = 270 }: { word: string; translation: string; highlight?: boolean; height?: number }) {
  return (
    <View>
      <View style={[styles.phone, { height }]}>
        <View style={styles.island} />
        <Text style={[type.callout, styles.date]}>Friday, October 31</Text>
        <Text style={[type.lockClock, styles.ink]}>9:41</Text>
        {/* The lock screen widget as it looks on a phone (Figma "Widgets", v1): word, meaning, five squares for the looks. */}
        <View testID="lock-widget" style={[styles.card, highlight && styles.cardOn]}>
          <LangText style={[type.headline, styles.ink]} numberOfLines={1} adjustsFontSizeToFit>
            {word}
          </LangText>
          <LangText style={[type.callout, styles.muted]} numberOfLines={1}>
            {translation}
          </LangText>
          <View accessible accessibilityLabel="Look 1 of 5" style={styles.looks}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View key={n} style={[styles.look, n === 1 && styles.lookOn]} />
            ))}
          </View>
        </View>
      </View>
      <View style={styles.ground} />
    </View>
  );
}

const styles = StyleSheet.create({
  ink: { color: colors.text },
  muted: { color: colors.muted },
  phone: { marginHorizontal: 40, borderTopLeftRadius: 44, borderTopRightRadius: 44, borderWidth: 6, borderBottomWidth: 0, borderColor: colors.text, backgroundColor: colors.chip, alignItems: 'center', paddingTop: space[12], overflow: 'hidden' },
  island: { width: 82, height: 24, borderRadius: radius.pill, backgroundColor: colors.black, marginBottom: space[16] },
  date: { color: colors.text2 },
  card: { alignSelf: 'stretch', marginHorizontal: space[16], marginTop: space[12], padding: space[12], gap: space[4], borderRadius: radius.sheet, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, ...lift, shadowOpacity: 0.08 },
  cardOn: { borderWidth: 2, borderColor: colors.button },
  looks: { flexDirection: 'row', gap: space[4], marginTop: space[4] },
  look: { width: 10, height: 10, borderRadius: 3, backgroundColor: colors.chip },
  lookOn: { backgroundColor: levelColors[1] },
  ground: { height: 1, backgroundColor: colors.line },
});
