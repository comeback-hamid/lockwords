import { StyleSheet, Text, View } from 'react-native';

import { colors, levelColors, lift, radius, space, type } from '@/theme/theme';

// A drawn phone top with a lock-screen word card (O2 Welcome, O14 Hard words).
export function LockPhone({ word, translation, highlight = false, height = 270 }: { word: string; translation: string; highlight?: boolean; height?: number }) {
  return (
    <View>
      <View style={[styles.phone, { height }]}>
        <View style={styles.island} />
        <Text style={[type.callout, styles.date]}>Friday, October 31</Text>
        <Text style={[type.lockClock, styles.ink]}>9:41</Text>
        <View style={[styles.card, highlight && styles.cardOn]}>
          <View style={styles.cardTop}>
            <Text style={[type.labelTag, styles.muted]}>LOCKWORDS</Text>
            <View style={styles.cardSquare} />
          </View>
          <View style={styles.cardWord}>
            <Text style={[type.headline, styles.ink]}>{word}</Text>
            <Text style={[type.callout, styles.muted]}>{translation}</Text>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: levelColors[1] },
  cardWord: { flexDirection: 'row', alignItems: 'baseline', gap: space[8], flexWrap: 'wrap' },
  ground: { height: 1, backgroundColor: colors.line },
});
