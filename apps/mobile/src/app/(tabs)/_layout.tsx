import { NativeTabs } from 'expo-router/native-tabs';

import { colors } from '@/theme/theme';

// shortcut: SF Symbols stand in for the Figma tab icons (Icon/24/*), replace in the first tab feature change.
export default function TabsLayout() {
  return (
    <NativeTabs backgroundColor={colors.surface} labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>New words</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sparkles" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Label>Review</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.stack" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="speak">
        <NativeTabs.Trigger.Label>Speak</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="waveform" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
