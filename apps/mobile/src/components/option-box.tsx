import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, levelColors, radius, space, type } from '@/theme/theme';

type Option<T extends string> = { value: T; label: string; description?: string; leading: ReactNode | ((selected: boolean) => ReactNode) };

// Figma Box + Option row (trailing = radio). One row can be selected.
export function OptionBox<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T | null; onChange(value: T): void }) {
  return (
    <View accessibilityRole="radiogroup" style={styles.box}>
      {options.map((o, i) => {
        const selected = o.value === value;
        const last = i === options.length - 1;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(o.value)}
            style={[styles.row, o.description ? styles.tall : null, selected && styles.rowSelected, !last && (selected ? styles.dividerSelected : styles.divider)]}>
            <View style={styles.leading}>{typeof o.leading === 'function' ? o.leading(selected) : o.leading}</View>
            <View style={styles.text}>
              <Text style={[selected ? type.bodyStrong : type.body, { color: selected ? colors.greenText : colors.text }]}>{o.label}</Text>
              {o.description ? <Text style={[type.caption, styles.description]}>{o.description}</Text> : null}
            </View>
            <Radio on={selected} />
          </Pressable>
        );
      })}
    </View>
  );
}

// Figma Radio: 20×20.
export function Radio({ on }: { on: boolean }) {
  return <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>;
}

// Figma Code badge: 32×24 outline with a 2-letter language code.
export function CodeBadge({ code, selected }: { code: string; selected: boolean }) {
  return (
    <View style={[styles.badge, { borderColor: selected ? levelColors[3] : colors.line }]}>
      <Text style={[type.badge, { color: selected ? colors.greenText : colors.text2 }]}>{code.toUpperCase()}</Text>
    </View>
  );
}

// Figma Level mark: 2×2 squares, n of them filled. n=1..4 use level colors s1, s2, s3, s5.
const MARK_COLORS = [levelColors[1], levelColors[2], levelColors[3], levelColors[5]] as const;
export function LevelMark({ n }: { n: 0 | 1 | 2 | 3 | 4 }) {
  return (
    <View style={styles.mark}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.markSquare, i < n ? { backgroundColor: MARK_COLORS[n - 1] } : styles.markEmpty]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16], backgroundColor: colors.surface },
  tall: { height: 64 },
  rowSelected: { backgroundColor: colors.greenBg },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  dividerSelected: { borderBottomWidth: 1, borderBottomColor: levelColors[1] },
  leading: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  description: { color: colors.muted },
  radio: { width: 20, height: 20, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderWidth: 0, backgroundColor: colors.button },
  radioDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.white },
  badge: { width: 32, height: 24, borderWidth: 1, borderRadius: radius.badge, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 22, height: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  markSquare: { width: 10, height: 10, borderRadius: 2 },
  markEmpty: { backgroundColor: levelColors[0], borderWidth: 1, borderColor: colors.divider },
});
