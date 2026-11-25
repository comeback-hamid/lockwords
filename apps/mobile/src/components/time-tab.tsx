import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, gold, radius, space, type } from '@/theme/theme';

type Props = {
  future: boolean; // false = Today
  today: string; // "Nov 25"
  by: string; // "by Feb 23"
  onChange(future: boolean): void;
};

// The time switch at the top of the Progress tab (Figma: Time tab): "Today" and "In 3 months". The whole page
// follows it. Today is the real page, so its part is gold when it is chosen; the future's part is plain.
export function TimeTab({ future, today, by, onChange }: Props) {
  return (
    <View style={styles.root} accessibilityRole="tablist">
      <Part label="Today" note={today} chosen={!future} golden onPress={() => onChange(false)} />
      <Part label="In 3 months" note={by} chosen={future} onPress={() => onChange(true)} />
    </View>
  );
}

function Part({ label, note, chosen, golden = false, onPress }: { label: string; note: string; chosen: boolean; golden?: boolean; onPress(): void }) {
  const lit = chosen && golden;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={`${label}, ${note}`}
      accessibilityState={{ selected: chosen }}
      onPress={onPress}
      style={[styles.part, chosen && styles.chosen, lit && styles.gold]}
    >
      <Text style={[chosen ? type.bodyStrong : type.body, { color: lit ? gold.text : chosen ? colors.text : colors.text2 }]}>{label}</Text>
      <Text style={[type.caption, { color: lit ? gold.text2 : colors.muted }]}>{note}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', flexDirection: 'row', gap: space[4], padding: space[4], borderRadius: radius.control, backgroundColor: colors.chip },
  part: { flex: 1, alignItems: 'center', paddingVertical: space[8] - 2, borderRadius: radius.control - space[4], borderWidth: 1.5, borderColor: 'transparent' },
  chosen: { backgroundColor: colors.surface, borderColor: colors.line },
  gold: { backgroundColor: gold.bg, borderColor: gold.line },
});
