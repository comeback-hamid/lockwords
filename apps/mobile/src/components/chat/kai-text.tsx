import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { fontFor } from '@/theme/script-font';

// The one place that reads **word** in Kai's and the server's text: the marked word is bold and the stars never show.
// Every text that can carry these marks goes through here (a chat line, its translation, a word card's texts).

// The text in parts: odd parts are bold. Stars with no partner are taken out and make nothing bold.
export function boldParts(text: string): string[] {
  const parts = text.split('**');
  return parts.length % 2 ? parts : [...parts.slice(0, -2), parts.slice(-2).join('')];
}
// The same text with no marks (for accessibility labels and comparing two lines).
export const plainText = (text: string) => text.replaceAll('**', '');

type Props = Omit<TextProps, 'children' | 'style'> & { text: string; style?: StyleProp<TextStyle>; boldStyle: StyleProp<TextStyle>; boldTestID?: string };
export function KaiText({ text, style, boldStyle, boldTestID, ...rest }: Props) {
  const own = fontFor(text, style);
  const ownBold = fontFor(text, boldStyle);
  return (
    // The whole line is drawn in the font of its script (a Persian line with one English word stays in one font).
    <Text {...rest} style={own ? [style, own] : style}>
      {boldParts(text).map((part, i) =>
        i % 2 ? (
          <Text key={i} testID={boldTestID} style={ownBold ? [boldStyle, ownBold] : boldStyle}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}
