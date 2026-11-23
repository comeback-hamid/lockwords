import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, space, type } from '@/theme/theme';

// Figma Reply option pills: stacked on the right. They are the last item of the chat's message list (render them
// inside the list, after the last line): they scroll with the chat and are never glued on top of the keyboard.
// In a short chat they sit at the bottom of the list, just above the composer (marginTop: auto).
export function ReplyOptions({ options, onPick }: { options: string[]; onPick(option: string): void }) {
  if (options.length === 0) return null;
  return (
    <View testID="reply-options" style={styles.group}>
      {options.map((option) => (
        <Pressable key={option} testID="reply-option" accessibilityRole="button" accessibilityLabel={option} onPress={() => {
            Keyboard.dismiss(); // a tapped answer needs no keyboard
            onPick(option);
          }} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
          <Text style={[type.calloutMedium, styles.label]}>{option}</Text>
        </Pressable>
      ))}
      <Text style={[type.caption, styles.hint]}>Tap an option, or type your own</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch', alignItems: 'flex-end', gap: space[8], marginTop: 'auto', paddingTop: space[8] },
  pill: { height: layout.minTapTarget, justifyContent: 'center', paddingHorizontal: space[16], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.chip },
  pressed: { backgroundColor: colors.divider },
  label: { color: colors.text },
  hint: { color: colors.muted },
});
