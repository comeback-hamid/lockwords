import { Children } from 'react';
import { Text, type TextProps } from 'react-native';

import { fontFor } from '@/theme/script-font';

// A Text for words that can be in any language (a word, a meaning, a deck title, a name, Kai's lines):
// it picks the font by the script of its text (src/theme/script-font.ts). Use it for every such text.
// Fixed English texts of the app stay plain `Text`.
export function LangText({ style, children, ...rest }: TextProps) {
  const text = Children.toArray(children)
    .filter((c): c is string => typeof c === 'string')
    .join('');
  return (
    <Text {...rest} style={[style, fontFor(text, style)]}>
      {children}
    </Text>
  );
}
