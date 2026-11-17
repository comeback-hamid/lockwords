import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, space, type } from '@/theme/theme';

// Figma "Translation toggle" (New words, top right next to Kai): the learner's language code and a switch.
// On: every Kai message and deck title shows a translation. Off: none do.
export function TranslationToggle({ code, on, onToggle }: { code: string; on: boolean; onToggle(): void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={`Translation, ${on ? 'on' : 'off'}`}
      accessibilityState={{ checked: on }}
      onPress={onToggle}
      hitSlop={(layout.minTapTarget - 36) / 2}
      style={styles.pill}>
      <Text style={[type.captionStrong, on ? styles.codeOn : styles.codeOff]}>{code}</Text>
      <View style={[styles.track, on ? styles.trackOn : styles.trackOff]}>
        <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: space[8], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  codeOn: { color: colors.text },
  codeOff: { color: colors.muted },
  track: { width: 30, height: 18, borderRadius: radius.pill, justifyContent: 'center', paddingHorizontal: 2 },
  trackOn: { backgroundColor: colors.button },
  trackOff: { backgroundColor: colors.lineStrong },
  knob: { width: 14, height: 14, borderRadius: radius.pill, backgroundColor: colors.white },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },
});
