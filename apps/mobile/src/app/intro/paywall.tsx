import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ButtonPrimary } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Radio } from '@/components/option-box';
import { markIntroDone } from '@/review/intro';
import { colors, layout, levelColors, radius, space, type } from '@/theme/theme';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'home', title: 'Hard words on your lock screen', text: 'Review every time you unlock' },
  { icon: 'sparkle', title: 'Your own decks from a prompt', text: 'Any topic, at your level' },
  { icon: 'stack', title: 'Fast swipe review', text: 'Easy, hard or know it' },
  { icon: 'mic', title: 'Use it', text: 'Make sentences, get kind feedback' },
];
// (open) final prices: these are the Figma values.
const PLANS = [
  { id: 'yearly', name: 'Yearly', text: '7 days free, then $39.99 a year', price: '$3.33/mo', badge: 'SAVE 52%' },
  { id: 'monthly', name: 'Monthly', text: '7 days free, then $6.99 a month', price: '$6.99/mo', badge: null },
] as const;

// O16 Paywall (soft). shortcut: NO purchase happens. RevenueCat is not connected, so the trial button and Close both
// open the app on the free plan. Do not ship to real users like this. The rating row and testimonials are left out
// until there are real ones (product.md: the Figma ones are placeholders).
export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<(typeof PLANS)[number]['id']>('yearly');
  const enter = async () => {
    await markIntroDone();
    router.replace('/(tabs)');
  };
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => void enter()} style={styles.close}>
          <Icon name="close" size={24} color={colors.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Image source={require('../../../assets/kai/kai-celebrate.svg')} style={styles.kai} contentFit="contain" accessibilityLabel="Kai" />
          <Text style={[type.label, styles.green]}>LOCKWORDS PRO</Text>
          <Text accessibilityRole="header" style={[type.title, styles.ink]}>
            Keep your words growing
          </Text>
        </View>
        <View style={styles.box}>
          {FEATURES.map((f, i) => (
            <View key={f.title} style={[styles.feature, i < FEATURES.length - 1 && styles.divider]}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} color={colors.greenText} />
              </View>
              <View style={styles.grow}>
                <Text style={[type.bodyStrong, styles.ink]}>{f.title}</Text>
                <Text style={[type.caption, styles.muted]}>{f.text}</Text>
              </View>
            </View>
          ))}
        </View>
        <View accessibilityRole="radiogroup" style={styles.plans}>
          {PLANS.map((p) => {
            const on = p.id === plan;
            return (
              <Pressable key={p.id} accessibilityRole="radio" accessibilityLabel={p.name} accessibilityState={{ checked: on }} onPress={() => setPlan(p.id)} style={[styles.plan, on && styles.planOn]}>
                <Radio on={on} />
                <View style={styles.grow}>
                  <View style={styles.planName}>
                    <Text style={[type.bodyStrong, styles.ink]}>{p.name}</Text>
                    {p.badge ? (
                      <View style={styles.badge}>
                        <Text style={[type.labelTag, styles.white]}>{p.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[type.caption, styles.muted]}>{p.text}</Text>
                </View>
                <Text style={[type.bodyStrong, styles.ink]}>{p.price}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space[12]) }]}>
        <ButtonPrimary label="Start 7-day free trial" onPress={() => void enter()} />
        <Text style={[type.caption, styles.muted, styles.center]}>No charge today · Reminder on day 5 · Cancel in 2 taps</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  top: { height: layout.minTapTarget, paddingLeft: 2 },
  close: { width: layout.minTapTarget, height: layout.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: layout.sideMargin, paddingBottom: space[24], gap: space[24] },
  head: { alignItems: 'center', gap: space[8] },
  kai: { width: 112, height: 80 },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  white: { color: colors.white },
  center: { textAlign: 'center' },
  grow: { flex: 1 },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.control, backgroundColor: colors.surface, overflow: 'hidden' },
  feature: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16], paddingVertical: space[8] },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  featureIcon: { width: 36, height: 36, borderRadius: radius.badge, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenBg },
  plans: { gap: space[12] },
  plan: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[16], paddingVertical: space[12], borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  planOn: { borderWidth: 2, borderColor: colors.button, backgroundColor: colors.greenBg },
  planName: { flexDirection: 'row', alignItems: 'center', gap: space[8] },
  badge: { paddingHorizontal: space[8], height: 20, justifyContent: 'center', borderRadius: 4, backgroundColor: levelColors[5] },
  footer: { paddingHorizontal: layout.sideMargin, paddingTop: space[12], gap: space[8], borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.canvas },
});
