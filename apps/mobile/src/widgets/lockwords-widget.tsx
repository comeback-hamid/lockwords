import { HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { aspectRatio, clipShape, containerBackground, font, foregroundStyle, frame, kerning, lineLimit, minimumScaleFactor, multilineTextAlignment, offset, opacity, resizable, widgetAccentedRenderingMode, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WidgetProps } from './timeline';

// The Lockwords widget (Figma page "Widgets", v1 frames). It shows hard words only.
// Four sizes: next to the date and rectangular on the lock screen, small and medium on the home screen.
// This function runs in the widget's own small runtime: no hooks, no network, no values from outside the function.
// Everything it shows comes in `props` (src/widgets/timeline.ts), put there by the app (src/widgets/sync.ts).
const Lockwords = (props: WidgetProps, environment: WidgetEnvironment) => {
  'widget';
  // Next to the date: one line of text. iOS decides the font.
  if (environment.widgetFamily === 'accessoryInline') {
    return <Text modifiers={[widgetURL(props.url)]}>{props.kind === 'word' ? `${props.word} · ${props.meaning}` : props.word}</Text>;
  }
  // Home screen, small (158×158) and medium (338×158): full color, light or dark with the phone.
  // Colors are the Figma frames "Home Screen · light" and "· dark". They are typed here because this function
  // cannot read the app's theme (it runs alone in the widget).
  if (environment.widgetFamily === 'systemSmall' || environment.widgetFamily === 'systemMedium') {
    const medium = environment.widgetFamily === 'systemMedium';
    const dark = environment.colorScheme === 'dark';
    // A tinted or clear home screen: iOS takes our colors away and keeps only how strong each part is.
    const tinted = environment.widgetRenderingMode === 'accented';
    const c = dark ? { card: '#161b22', text: '#f0f6fc', muted: '#9198a1', label: '#ff7b72', brand: '#3fb950', empty: '#2a313c' } : { card: '#ffffff', text: '#1f2328', muted: '#59636e', label: '#d1242f', brand: '#116329', empty: '#eff2f5' };
    const greens = dark ? ['#0e4429', '#006d32', '#26a641', '#39d353', '#7ee787'] : ['#aceebb', '#6fdd8b', '#4ac26b', '#2da44e', '#116329'];
    const isWord = props.kind === 'word';
    // Persian, Arabic and Hebrew start at the right.
    const side = (t: string) => (/[֐-ࣿיִ-ﻼ]/.test(t) ? 'trailing' : 'leading');
    const wide = (t: string) => [frame({ maxWidth: 10000, alignment: side(t) }), multilineTextAlignment(side(t))];
    const kaiFile = props.kaiColor ?? '';
    const kai = (width: number, height: number) => (kaiFile ? <Image uiImage={kaiFile} modifiers={[resizable(), widgetAccentedRenderingMode('accentedDesaturated'), frame({ width, height })]} /> : null);
    const text = (
      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' })]}>
        <Text modifiers={[font({ size: 11, weight: 'medium', design: 'monospaced' }), kerning(0.6), foregroundStyle(isWord ? c.label : c.brand), lineLimit(1)]}>{isWord ? 'HARD WORD' : 'LOCKWORDS'}</Text>
        <Text modifiers={[font({ size: medium ? 26 : 22, weight: 'semibold' }), foregroundStyle(c.text), lineLimit(1), minimumScaleFactor(0.6), ...wide(props.word)]}>{props.word}</Text>
        <Text modifiers={[font({ size: 15 }), foregroundStyle(c.muted), lineLimit(medium ? 1 : 2), minimumScaleFactor(0.8), ...wide(props.meaning)]}>{props.meaning}</Text>
        {medium && props.example ? (
          <Text markdownEnabled modifiers={[font({ size: 13 }), foregroundStyle(c.muted), lineLimit(2), minimumScaleFactor(0.85), ...wide(props.example)]}>
            {props.example}
          </Text>
        ) : null}
        <Spacer minLength={0} />
        {props.look > 0 ? (
          <HStack spacing={4}>
            {[1, 2, 3, 4, 5].map((n) => (
              <RoundedRectangle key={n} cornerRadius={2.5} modifiers={[frame({ width: 10, height: 10 }), foregroundStyle(tinted ? '#ffffff' : n <= props.look ? greens[n - 1]! : c.empty), opacity(tinted && n > props.look ? 0.3 : 1)]} />
            ))}
          </HStack>
        ) : null}
      </VStack>
    );
    const background = [containerBackground(c.card, 'widget'), widgetURL(props.url)];
    if (!medium) {
      // Small: the text on top, Kai in the bottom right corner, a little over the edge.
      return (
        <ZStack alignment="bottomTrailing" modifiers={background}>
          {text}
          {kai(84, 60) ? <VStack modifiers={[offset({ x: 12, y: 10 })]}>{kai(84, 60)}</VStack> : null}
        </ZStack>
      );
    }
    // Medium: the text on the left; on the right the word's picture with a small Kai at its corner, or a big Kai.
    return (
      <HStack alignment="bottom" spacing={10} modifiers={background}>
        {text}
        {props.picture ? (
          <ZStack alignment="bottomLeading">
            <Image uiImage={props.picture} modifiers={[resizable(), widgetAccentedRenderingMode('desaturated'), aspectRatio({ contentMode: 'fill' }), frame({ width: 126, height: 126 }), clipShape('roundedRectangle', 16), opacity(tinted ? 0.55 : 1)]} />
            {kai(78, 56) ? <VStack modifiers={[offset({ x: -34, y: 8 })]}>{kai(78, 56)}</VStack> : null}
          </ZStack>
        ) : (
          kai(124, 88)
        )}
      </HStack>
    );
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
