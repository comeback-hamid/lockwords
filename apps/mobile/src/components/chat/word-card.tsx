import * as Speech from 'expo-speech';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { KaiWord } from '@/api/client';
import { Icon } from '@/components/icon';
import { getSpeechLanguage } from '@/review/speech-language';
import { colors, layout, radius, space, type } from '@/theme/theme';

// Figma Word card (N6): a single word Kai gave in the chat. The meaning and the example's translation always show,
// also when the chat's translations are off. One button adds the word to the Random Words deck the server named.
// onAdd: resolves with what happened, rejects when adding failed.
type Props = { word: KaiWord; onAdd(): Promise<'added' | 'already'> };
type State = 'idle' | 'busy' | 'added' | 'already';

// The example in parts; odd parts are the word. Kai marks the word with **; with no marks we look for the word itself.
function exampleParts(example: string, word: string): string[] {
  if (example.includes('**')) return example.split('**');
  const at = example.toLowerCase().indexOf(word.toLowerCase());
  return at < 0 ? [example] : [example.slice(0, at), example.slice(at, at + word.length), example.slice(at + word.length)];
}

export function WordCard({ word, onAdd }: Props) {
  const [state, setState] = useState<State>(word.added ? 'added' : word.already ? 'already' : 'idle');
  const [failed, setFailed] = useState(false);
  const parts = exampleParts(word.example, word.word);
  const done = state === 'added' || state === 'already';
  const label = state === 'added' ? 'Added' : state === 'already' ? 'Already in your words' : `Add to ${word.addTo}`;

  async function add() {
    setState('busy');
    setFailed(false);
    try {
      setState(await onAdd());
    } catch {
      setState('idle');
      setFailed(true);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.wordRow}>
        <Text style={[type.headline, styles.word]}>{word.word}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Say the word" onPress={() => Speech.speak(word.word, { language: getSpeechLanguage() })} hitSlop={space[4]} style={styles.speaker}>
          <Icon name="speaker" color={colors.text2} />
        </Pressable>
      </View>
      <Text style={[type.callout, styles.muted]}>{word.translation}</Text>
      <View testID="word-card-divider" style={styles.divider} />
      <Text accessibilityLabel={parts.join('')} style={[type.body, styles.ink]}>
        {parts.map((part, i) =>
          i % 2 ? (
            <Text key={i} testID="example-word" style={[type.bodyStrong, styles.green]}>
              {part}
            </Text>
          ) : (
            part
          ),
        )}
      </Text>
      <Text style={[type.caption, styles.muted]}>{word.exampleTranslation}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: state !== 'idle', busy: state === 'busy' }}
          disabled={state !== 'idle'}
          onPress={() => void add()}
          style={({ pressed }) => [styles.add, pressed && styles.addPressed, done && styles.addDone]}
        >
          {state === 'busy' ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : state === 'added' ? (
            <View testID="added-check">
              <Icon name="check" color={colors.greenText} />
            </View>
          ) : state === 'idle' ? (
            <Icon name="plus" color={colors.white} />
          ) : null}
          <Text style={[type.calloutMedium, done ? styles.green : styles.white]}>{label}</Text>
        </Pressable>
      </View>
      {failed ? <Text style={[type.caption, styles.failed]}>Couldn’t add it. Try again.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', marginRight: space[24], paddingHorizontal: 14, paddingTop: 14, paddingBottom: space[12], gap: space[4], borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { flex: 1, color: colors.text },
  speaker: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  white: { color: colors.white },
  divider: { height: 1, alignSelf: 'stretch', backgroundColor: colors.divider },
  actions: { flexDirection: 'row', paddingTop: space[8] },
  add: { height: layout.minTapTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space[16], borderRadius: radius.control, backgroundColor: colors.button },
  addPressed: { backgroundColor: colors.buttonPressed },
  addDone: { backgroundColor: colors.greenBg },
  failed: { color: colors.hard, paddingTop: space[4] },
});
