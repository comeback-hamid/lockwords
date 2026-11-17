import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme/theme';

// Figma Chat bubble. Kai: white, on the left. User: green, on the right. **word** in the text is bold.
// A Kai bubble can show a translation: a thin line, then the same message in the learner's language in small gray text.
type Props = { from: 'kai' | 'user'; text: string; translation?: string | null; showTranslation?: boolean };
export function ChatBubble({ from, text, translation, showTranslation = false }: Props) {
  const parts = text.split('**'); // odd parts are bold
  const plain = parts.join('');
  const translated = from === 'kai' && showTranslation && translation ? translation : null;
  return (
    <View accessible accessibilityLabel={`${from === 'kai' ? 'Kai' : 'You'}: ${plain}`} style={[styles.bubble, from === 'kai' ? styles.kai : styles.user]}>
      <Text style={[type.body, styles.text]}>
        {parts.map((part, i) =>
          i % 2 ? (
            <Text key={i} style={[type.bodyStrong, styles.text]}>
              {part}
            </Text>
          ) : (
            part
          ),
        )}
      </Text>
      {translated ? (
        <>
          <View testID="translation-divider" style={styles.divider} />
          <Text style={[type.caption, styles.translation]}>{translated}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.control },
  kai: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  user: { alignSelf: 'flex-end', backgroundColor: colors.greenBg, marginVertical: space[8] },
  text: { color: colors.text },
  divider: { height: 1, marginTop: 6, marginBottom: 6, backgroundColor: colors.divider },
  translation: { color: colors.muted },
});
