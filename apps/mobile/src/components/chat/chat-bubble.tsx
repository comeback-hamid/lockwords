import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme/theme';

// Figma Chat bubble. Kai: white, on the left. User: green, on the right. **word** in the text is bold.
export function ChatBubble({ from, text }: { from: 'kai' | 'user'; text: string }) {
  const parts = text.split('**'); // odd parts are bold
  const plain = parts.join('');
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
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.control },
  kai: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  user: { alignSelf: 'flex-end', backgroundColor: colors.greenBg, marginVertical: space[8] },
  text: { color: colors.text },
});
