import { requestRecordingPermissionsAsync } from 'expo-audio';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, layout, radius, space, type } from '@/theme/theme';

import { directionStyle } from './direction';
import { closeKeyboard } from './keyboard';
import { addSpoken, transcribeRecording } from './voice';
import { VoiceRecorder } from './voice-recorder';

// How tall the text grows before it scrolls inside the box (Hamid, 2026-11-24).
const MAX_LINES = 6;

// Figma Composer: text box + one round button (mic when empty, green send when there is text).
// The mic (every chat): tap it and speak; the box becomes the recorder (X, the wave, Stop). Stop writes what was said
// into the box, where the learner can change it before sending. `mic={false}` leaves the mic out.
// The box grows with its text up to six lines, then the text scrolls inside it.
// `defaultValue` puts a text back in the box. `canSend={false}` (Kai is still answering): the learner can keep typing,
// the text stays in the box, and send waits. onTextChange: the screen hears typing (Kai listens while there is text).
// Return on the keyboard sends the text (when it can) and always closes the keyboard.
// The typed text is aligned by its own script (Persian to the right).
type Props = { placeholder: string; onSend(text: string): void; maxLength?: number; mic?: boolean; defaultValue?: string; canSend?: boolean; onTextChange?(text: string): void };
export function Composer({ placeholder, onSend, maxLength = 80, mic = true, defaultValue = '', canSend = true, onTextChange }: Props) {
  const [text, setTextState] = useState(defaultValue);
  const [voice, setVoice] = useState<'off' | 'recording' | 'writing'>('off');
  const [note, setNote] = useState<string | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const setText = (t: string) => {
    setTextState(t);
    onTextChange?.(t);
  };
  const ready = text.trim() !== '';
  const send = () => {
    if (!ready || !canSend) return;
    onSend(text.trim());
    setText('');
  };

  async function startVoice() {
    setNote(null);
    closeKeyboard();
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (granted) setVoice('recording');
      else setNote('Allow the microphone for Lockwords in Settings to speak.');
    } catch {
      setNote('The microphone does not work here.');
    }
  }
  async function write(uri: string | null) {
    if (!uri) {
      setVoice('off');
      return setNote('That did not record. Try again.');
    }
    setVoice('writing');
    try {
      const spoken = await transcribeRecording(uri);
      if (spoken) setText(addSpoken(text, spoken).slice(0, maxLength));
      else setNote('I heard nothing. Try again.');
    } catch {
      setNote('I could not write that. Try again.');
    }
    setVoice('off');
  }

  return (
    <View style={styles.bar}>
      {note ? <Text style={[type.label, styles.note]}>{note}</Text> : null}
      <View style={[styles.box, ready && voice === 'off' && styles.boxActive]}>
        {voice === 'recording' ? (
          <VoiceRecorder onCancel={() => setVoice('off')} onStop={(uri) => void write(uri)} />
        ) : voice === 'writing' ? (
          <View style={styles.writing} accessibilityLabel="Writing what you said">
            <ActivityIndicator color={colors.button} />
            <Text style={[type.callout, styles.muted]}>Writing what you said…</Text>
          </View>
        ) : (
          <>
            <TextInput
              ref={input}
              accessibilityLabel="Message"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => {
                send();
                input.current?.blur(); // the box itself lets go, also when another view took the keyboard call
                closeKeyboard();
              }}
              submitBehavior="blurAndSubmit"
              multiline
              placeholder={placeholder}
              placeholderTextColor={colors.subtle}
              maxLength={maxLength}
              returnKeyType="send"
              style={[type.callout, styles.input, directionStyle(text)]}
              selectionColor={colors.button}
            />
            {ready ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Send" accessibilityState={{ disabled: !canSend }} onPress={send} style={[styles.round, styles.send, !canSend && styles.waiting]}>
                <Icon name="send" color={colors.white} />
              </Pressable>
            ) : !mic ? null : (
              <Pressable accessibilityRole="button" accessibilityLabel="Voice message" onPress={() => void startVoice()} style={styles.round}>
                <Icon name="mic" color={colors.text2} />
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const LINE = type.callout.lineHeight;
const styles = StyleSheet.create({
  bar: { paddingHorizontal: layout.sideMargin, paddingTop: space[12], borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.canvas },
  // The round button stays at the bottom while the box grows.
  box: { minHeight: 52, flexDirection: 'row', alignItems: 'flex-end', gap: space[8], paddingLeft: space[12], paddingRight: space[8], paddingVertical: space[8] - 1, borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  boxActive: { borderWidth: 2, borderColor: colors.button, paddingVertical: space[8] - 2, paddingLeft: space[12] - 1, paddingRight: space[8] - 1 },
  input: { flex: 1, minHeight: 36, maxHeight: MAX_LINES * LINE + space[12], paddingTop: space[8] - 1, paddingBottom: space[8] - 1, color: colors.text },
  round: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip },
  send: { backgroundColor: colors.button },
  waiting: { opacity: 0.4 },
  writing: { flex: 1, height: 36, flexDirection: 'row', alignItems: 'center', gap: space[8] },
  muted: { color: colors.muted },
  note: { color: colors.hard, paddingBottom: space[8] - 2 },
});
