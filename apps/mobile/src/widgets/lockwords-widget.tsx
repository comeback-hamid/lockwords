import { HStack, Image, RoundedRectangle, Text, VStack } from '@expo/ui/swift-ui';
import { font, frame, lineLimit, minimumScaleFactor, opacity, resizable, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WidgetProps } from './timeline';

// The Lockwords widget (Figma page "Widgets", v1 frames). It shows hard words only.
// This function runs in the widget's own small runtime: no hooks, no network, no values from outside the function.
// Everything it shows comes in `props` (src/widgets/timeline.ts), put there by the app (src/widgets/sync.ts).
const Lockwords = (props: WidgetProps, environment: WidgetEnvironment) => {
  'widget';
  // Next to the date: one line of text. iOS decides the font.
  if (environment.widgetFamily === 'accessoryInline') {
    return <Text modifiers={[widgetURL(props.url)]}>{props.kind === 'word' ? `${props.word} · ${props.meaning}` : props.word}</Text>;
  }
  // Lock screen, rectangular (160×72): word, meaning, five squares for the look, Kai in one color.
  return (
    <HStack alignment="bottom" spacing={4} modifiers={[widgetURL(props.url)]}>
      {/* The text takes all the room, so Kai sits at the right edge. */}
      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 10000, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: 17, weight: 'semibold' }), lineLimit(1), minimumScaleFactor(0.7)]}>{props.word}</Text>
        <Text modifiers={[font({ size: 15 }), opacity(0.82), lineLimit(1), minimumScaleFactor(0.75)]}>{props.meaning}</Text>
        {props.look > 0 ? (
          <HStack spacing={3}>
            {[1, 2, 3, 4, 5].map((n) => (
              <RoundedRectangle key={n} cornerRadius={2} modifiers={[frame({ width: 8, height: 8 }), opacity(n <= props.look ? 1 : 0.32)]} />
            ))}
          </HStack>
        ) : null}
      </VStack>
      {/* No Kai for a long word or meaning: the text gets the whole width. */}
      {props.kai ? <Image uiImage={props.kai} modifiers={[resizable(), frame({ width: 62, height: 44 })]} /> : null}
    </HStack>
  );
};

export default createWidget<WidgetProps>('Lockwords', Lockwords, { kind: 'empty', word: 'No hard words', meaning: 'Swipe left in Review', look: 0, kai: '', url: 'lockwords://review' });
