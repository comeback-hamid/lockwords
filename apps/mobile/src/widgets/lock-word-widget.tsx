import { Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, lineLimit, opacity } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { PlatformColor } from 'react-native';

// SPIKE (spike/widget branch, not for main): proves a server word can reach the lock screen.
// The real widgets come in roadmap epic 6 (`lock-widgets`) with their own spec.
export type LockWordProps = { word: string; meaning: string };

const LockWord = (props: LockWordProps, environment: WidgetEnvironment) => {
  'widget';
  // Widget runtime: system font only (Mona Sans would need font files inside the extension).
  if (environment.widgetFamily === 'accessoryInline') {
    return <Text>{props.word} · {props.meaning}</Text>;
  }
  return (
    <VStack alignment="leading" modifiers={[containerBackground(PlatformColor('systemBackground'), 'widget')]}>
      <Text modifiers={[font({ size: 17, weight: 'semibold' }), lineLimit(1)]}>{props.word}</Text>
      <Text modifiers={[font({ size: 13 }), opacity(0.7), lineLimit(1)]}>{props.meaning}</Text>
    </VStack>
  );
};

export default createWidget('LockWord', LockWord, { word: 'Lockwords', meaning: 'open the app' });
