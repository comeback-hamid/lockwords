import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, space, type } from '@/theme/theme';

// Figma Reply option pills: stacked on the right, just above the composer.
export function ReplyOptions({ options, onPick }: { options: string[]; onPick(option: string): void }) {
  if (options.length === 0) return null;
  return (
    <View style={styles.group}>
      {options.map((option) => (
        <Pressable key={option} accessibilityRole="button" accessibilityLabel={option} onPress={() => onPick(option)} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
          <Text style={[type.calloutMedium, styles.label]}>{option}</Text>
        </Pressable>
      ))}
      <Text style={[type.caption, styles.hint]}>Tap an option, or type your own</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignItems: 'flex-end', gap: space[8], paddingHorizontal: layout.sideMargin, paddingBottom: space[8] },
  pill: { height: layout.minTapTarget, justifyContent: 'center', paddingHorizontal: space[16], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.chip },
  pressed: { backgroundColor: colors.divider },
  label: { color: colors.text },
  hint: { color: colors.muted },
});
