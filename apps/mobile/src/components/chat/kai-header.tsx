import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import type { KaiPose } from '@/onboarding/kai-script';
import { colors, layout, lift, space } from '@/theme/theme';

const POSES: Record<KaiPose, number> = {
  greeting: require('../../../assets/kai/kai-greeting.svg'),
  idle: require('../../../assets/kai/kai-idle.svg'),
  listening: require('../../../assets/kai/kai-listening.svg'),
  thinking: require('../../../assets/kai/kai-thinking.svg'),
  celebrate: require('../../../assets/kai/kai-celebrate.svg'),
};

// Figma Kai header: one big Kai on top of every chat, messages scroll under it. No title, no small avatars.
// shortcut: a still picture per pose with a slow "breathe" move; the animated renderer is the `kai-character` change.
// `right` is a small control at the top right, next to Kai (the translation button on New words).
export function KaiHeader({ pose, back = true, icon = 'back', right }: { pose: KaiPose; back?: boolean; icon?: 'back' | 'close'; right?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [breathe] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: -3, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);
  return (
    <View style={[styles.header, { paddingTop: insets.top, height: layout.kaiHeaderHeight - 54 + insets.top }]}>
      {back ? (
        <Pressable accessibilityRole="button" accessibilityLabel={icon === 'close' ? 'Close' : 'Back'} onPress={() => router.back()} style={[styles.back, { top: insets.top }]}>
          <Icon name={icon} size={24} color={colors.text} />
        </Pressable>
      ) : null}
      {right ? <View style={[styles.right, { top: insets.top + space[8] }]}>{right}</View> : null}
      <Animated.View style={{ transform: [{ translateY: breathe }] }}>
        <Image source={POSES[pose]} style={styles.kai} contentFit="contain" accessibilityLabel="Kai" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, zIndex: 1, ...lift, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  back: { position: 'absolute', left: 2, width: layout.minTapTarget, height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  right: { position: 'absolute', right: layout.sideMargin },
  kai: { width: 150, height: 107 },
});
