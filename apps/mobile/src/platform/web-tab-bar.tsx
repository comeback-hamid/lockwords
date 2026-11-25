import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme/theme';

const TABS = {
  index: { label: 'New words', icon: require('../../assets/tabs/new-words.png') },
  review: { label: 'Review', icon: require('../../assets/tabs/review.png') },
  progress: { label: 'Progress', icon: require('../../assets/tabs/progress.png') },
} as const;
export type TabName = keyof typeof TABS;

// `onOpen` gets the tab's route key (the navigator's own name for it).
type Props = { state: { index: number; routes: { key: string; name: string }[] }; dot: boolean; onOpen(routeKey: string): void };

// The web app's tab bar (Figma Tab bar): the same three tabs, icons and colors as the phone's system bar.
// Drawn by us, because a browser has no system tab bar. `dot` = the red dot on Review.
export function WebTabBar({ state, dot, onOpen }: Props) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {state.routes.map((route, i) => {
        const tab = TABS[route.name as TabName];
        if (!tab) return null;
        const open = state.index === i;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: open }}
            onPress={() => (open ? undefined : onOpen(route.key))}
            style={styles.tab}>
            <View>
              <Image source={tab.icon} style={styles.icon} tintColor={open ? colors.button : colors.muted} contentFit="contain" />
              {route.name === 'review' && dot ? <View accessibilityLabel="New words to review" style={styles.dot} /> : null}
            </View>
            <Text style={[open ? type.tabActive : type.tab, styles.label, { color: open ? colors.text : colors.muted }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 64, flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { width: 24, height: 24 },
  // A line taller than the font: the browser cut the letters under the line (g, p) at the font's own height.
  label: { lineHeight: 16 },
  dot: { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.hard },
});
