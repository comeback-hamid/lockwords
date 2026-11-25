import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme/theme';

type Props = {
  future: boolean; // false = Today
  today: string; // "Nov 25"
  by: string; // "by Feb 23"
  onChange(future: boolean): void;
};

// The time switch at the top of the Progress tab (Figma: Time tab): "Today" and "In 3 months". The whole page
// follows it. The chosen part is a white pill with bold text and its note in the app's green; the other part is
// plain. Only the app's own colors (Hamid, 2026-11-25: the yellow of before was not in the palette).
export function TimeTab({ future, today, by, onChange }: Props) {
  return (
    <View style={styles.root} accessibilityRole="tablist">
      <Part label="Today" note={today} chosen={!future} onPress={() => onChange(false)} />
      <Part label="In 3 months" note={by} chosen={future} onPress={() => onChange(true)} />
    </View>
  );
}

function Part({ label, note, chosen, onPress }: { label: string; note: string; chosen: boolean; onPress(): void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={`${label}, ${note}`} accessibilityState={{ selected: chosen }} onPress={onPress} style={[styles.part, chosen && styles.chosen]}>
      <Text style={[chosen ? type.bodyStrong : type.body, { color: chosen ? colors.text : colors.text2 }]}>{label}</Text>
      <Text style={[chosen ? type.captionStrong : type.caption, { color: chosen ? colors.greenText : colors.muted }]}>{note}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', flexDirection: 'row', gap: space[4], padding: space[4], borderRadius: radius.control, backgroundColor: colors.chip },
  part: { flex: 1, alignItems: 'center', paddingVertical: space[8] - 2, borderRadius: radius.control - space[4], borderWidth: 1.5, borderColor: 'transparent' },
  chosen: { backgroundColor: colors.surface, borderColor: colors.line },
});
