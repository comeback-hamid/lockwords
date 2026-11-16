import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, space, type } from '@/theme/theme';

// The quiet loading line and the error + "Try again" block that screens show while they wait for the server.
export function Loading({ label }: { label: string }) {
  return <Text style={[type.callout, styles.muted]}>{label}</Text>;
}

export function LoadError({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <View style={styles.error}>
      <Text style={[type.callout, styles.muted]}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry} style={styles.retry}>
        <Text style={[type.calloutMedium, styles.retryLabel]}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, textAlign: 'center' },
  error: { alignItems: 'center', gap: space[4] },
  retry: { height: layout.minTapTarget, justifyContent: 'center', paddingHorizontal: space[16] },
  retryLabel: { color: colors.greenText, textDecorationLine: 'underline' },
});
