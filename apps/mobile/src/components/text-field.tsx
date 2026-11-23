import { StyleSheet, Text, TextInput, View } from 'react-native';

import { closeKeyboard } from '@/components/chat/keyboard';
import { colors, radius, space, type } from '@/theme/theme';

type Props = { label: string; accessibilityLabel: string; value: string; onChangeText(text: string): void; maxLength?: number };

// Figma text box under an "Other" row (O1b): mono label + a green-edged field. Return closes the keyboard.
export function TextField({ label, accessibilityLabel, value, onChangeText, maxLength = 40 }: Props) {
  return (
    <View style={styles.group}>
      <Text style={[type.label, styles.label]}>{label.toUpperCase()}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        autoFocus
        autoCorrect={false}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={closeKeyboard}
        style={[type.body, styles.input]}
        selectionColor={colors.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[8] },
  label: { color: colors.muted },
  input: { height: 48, lineHeight: undefined, borderWidth: 2, borderColor: colors.button, borderRadius: radius.control, backgroundColor: colors.surface, paddingHorizontal: space[16], color: colors.text },
});
