import { useRouter } from 'expo-router';
import type { ComponentRef, ReactNode, Ref } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOTAL_STEPS } from '@/onboarding/flow';
import { colors, layout, space, type } from '@/theme/theme';

import { ButtonPrimary, TextLink } from './button';
import { Icon } from './icon';

type Props = {
  step?: number; // no step = back button only (O2 Welcome)
  back?: boolean;
  title?: string;
  children: ReactNode;
  button: { label: string; onPress(): void; disabled?: boolean };
  link?: { label: string; onPress(): void };
  message?: string; // a short error line above the button
  // Optional: lets a screen watch and move the scroll (the word test's "See all words").
  scroll?: { ref?: Ref<ComponentRef<typeof ScrollView>> } & Pick<ScrollViewProps, 'onScroll' | 'onLayout' | 'onContentSizeChange'>;
};

// The frame of every onboarding question: Figma Top bar + Content + Footer.
export function QuestionScreen({ step, back = true, title, children, button, link, message, scroll }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <View style={styles.back}>
          {back ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
              <Icon name="back" size={24} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
        {step ? (
          <>
            <View style={styles.progress}>
              <View style={[styles.fill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
            </View>
            <Text style={[type.label, styles.counter]}>{`${step}/${TOTAL_STEPS}`}</Text>
          </>
        ) : null}
      </View>
      <ScrollView
        testID="question-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={64}
        {...scroll}>
        {title ? (
          <Text accessibilityRole="header" style={[type.title, styles.title]}>
            {title}
          </Text>
        ) : null}
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space[12]) }]}>
        {message ? <Text style={[type.caption, styles.message]}>{message}</Text> : null}
        <ButtonPrimary {...button} />
        <View style={styles.linkSlot}>{link ? <TextLink {...link} /> : null}</View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  topBar: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 18, paddingLeft: 2, paddingRight: layout.sideMargin },
  back: { width: layout.minTapTarget, height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.button },
  counter: { width: 44, textAlign: 'right', color: colors.muted },
  scroll: { flex: 1 },
  content: { paddingHorizontal: layout.sideMargin, paddingTop: space[24], paddingBottom: space[24], gap: space[32] },
  title: { color: colors.text },
  footer: { paddingHorizontal: layout.sideMargin },
  message: { color: colors.hard, textAlign: 'center', marginBottom: space[8] },
  linkSlot: { height: layout.minTapTarget, alignItems: 'center' },
});
