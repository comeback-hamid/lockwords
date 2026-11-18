import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Kai, type KaiState } from '@/kai/kai';
import { colors, layout, lift } from '@/theme/theme';

// Figma Kai header: one big Kai on top of every chat, messages scroll under it. No title, no small avatars.
// Kai is live (src/kai): the state moves, blinks and plays its effect. Still SVGs stay only for widgets.
const KAI_WIDTH = 150;

// progress (0 to 1) feeds Kai's `making` state while a deck is made.
export function KaiHeader({ pose, back = true, icon = 'back', progress }: { pose: KaiState; back?: boolean; icon?: 'back' | 'close'; progress?: number }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top, height: layout.kaiHeaderHeight - 54 + insets.top }]}>
      {back ? (
        <Pressable accessibilityRole="button" accessibilityLabel={icon === 'close' ? 'Close' : 'Back'} onPress={() => router.back()} style={[styles.back, { top: insets.top }]}>
          <Icon name={icon} size={24} color={colors.text} />
        </Pressable>
      ) : null}
      <Kai state={pose} size={KAI_WIDTH} progress={progress} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, zIndex: 1, ...lift, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  back: { position: 'absolute', left: 2, width: layout.minTapTarget, height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
});
