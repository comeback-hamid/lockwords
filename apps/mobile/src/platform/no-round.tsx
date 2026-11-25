import { Redirect } from 'expo-router';
import { Platform, View } from 'react-native';

import { colors } from '@/theme/theme';

// Use it opened with no round in memory. On the phone that is a deep link with nothing to show (an empty screen, as
// before). In a browser it is a reload of the Use it address: an empty page would look broken, so it opens Review,
// where the round starts again.
export function NoRound() {
  if (Platform.OS === 'web') return <Redirect href="/(tabs)/review" />;
  return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
}
