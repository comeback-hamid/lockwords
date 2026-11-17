import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, layout, radius, space, type } from '@/theme/theme';

// Figma Composer: text box + one round button (mic when empty, green send when there is text).
// `mic={false}` is for text-only screens: no round button until there is text. `defaultValue` puts a text back in the box.
type Props = { placeholder: string; onSend(text: string): void; maxLength?: number; mic?: boolean; defaultValue?: string };
export function Composer({ placeholder, onSend, maxLength = 80, mic = true, defaultValue = '' }: Props) {
  const [text, setText] = useState(defaultValue);
  const ready = text.trim() !== '';
  const send = () => {
    if (!ready) return;
    onSend(text.trim());
    setText('');
  };
  return (
    <View style={styles.bar}>
      <View style={[styles.box, ready && styles.boxActive]}>
        <TextInput
          accessibilityLabel="Message"
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder={placeholder}
          placeholderTextColor={colors.subtle}
          maxLength={maxLength}
          returnKeyType="send"
          style={[type.callout, styles.input]}
          selectionColor={colors.button}
        />
        {ready ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send} style={[styles.round, styles.send]}>
            <Icon name="send" color={colors.white} />
          </Pressable>
        ) : !mic ? null : (
          // shortcut: the mic does nothing yet; voice input comes with the Speak work.
          <Pressable accessibilityRole="button" accessibilityLabel="Voice message" style={styles.round}>
            <Icon name="mic" color={colors.text2} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: layout.sideMargin, paddingTop: space[12], borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.canvas },
  box: { height: 52, flexDirection: 'row', alignItems: 'center', gap: space[8], paddingLeft: space[12], paddingRight: space[8], borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  boxActive: { borderWidth: 2, borderColor: colors.button },
  input: { flex: 1, lineHeight: undefined, color: colors.text },
  round: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip },
  send: { backgroundColor: colors.button },
});
