import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, levelColors, radius, space, type } from '@/theme/theme';

import { WEB } from './web-layout';

const TABS = {
  index: { label: 'New words', icon: require('../../assets/tabs/new-words.png') },
  review: { label: 'Review', icon: require('../../assets/tabs/review.png') },
  progress: { label: 'Progress', icon: require('../../assets/tabs/progress.png') },
} as const;
export type TabName = keyof typeof TABS;

// `onOpen` gets the tab's route key (the navigator's own name for it).
type Props = { state: { index: number; routes: { key: string; name: string }[] }; dot: boolean; onOpen(routeKey: string): void; side?: boolean };

// The web app's tab bar (Figma Tab bar): the same three tabs, icons and colors as the phone's system bar.
// Drawn by us, because a browser has no system tab bar. `dot` = the red dot on Review.
export function WebTabBar({ state, dot, onOpen, side = false }: Props) {
  if (side) return <SideBar state={state} dot={dot} onOpen={onOpen} />;
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

// A wide window (Figma Web · Side bar): the same three tabs as rows on the left, under the name.
function SideBar({ state, dot, onOpen }: Props) {
  return (
    <View style={styles.side}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <View style={styles.markBack} />
          <View style={styles.markFront} />
        </View>
        <Text style={[type.bodyStrong, { color: colors.text }]}>Lockwords</Text>
      </View>
      <View accessibilityRole="tablist" style={styles.rows}>
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
              style={[styles.row, open && styles.rowOpen]}>
              <View>
                <Image source={tab.icon} style={styles.icon} tintColor={open ? colors.button : colors.muted} contentFit="contain" />
                {route.name === 'review' && dot ? <View accessibilityLabel="New words to review" style={styles.dot} /> : null}
              </View>
              <Text style={[open ? type.bodyStrong : type.body, { color: open ? colors.text : colors.text2 }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  side: { flex: 1, width: WEB.rail, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.divider, paddingHorizontal: space[16], paddingTop: space[24], gap: space[24] },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space[8], paddingHorizontal: space[12] },
  mark: { width: 24, height: 24 },
  markBack: { position: 'absolute', left: 0, top: 0, width: 16, height: 16, borderRadius: 4, backgroundColor: colors.text },
  markFront: { position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, borderRadius: 4, backgroundColor: levelColors[3] },
  rows: { gap: space[4] },
  row: { height: 48, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[12], borderRadius: radius.control },
  rowOpen: { backgroundColor: colors.chip },
  bar: { height: 64, flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { width: 24, height: 24 },
  // A line taller than the font: the browser cut the letters under the line (g, p) at the font's own height.
  label: { lineHeight: 16 },
  dot: { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.hard },
});
