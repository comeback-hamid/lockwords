import { StyleSheet, Text, View } from 'react-native';

import { useMe } from '@/auth/me-store';
import { colors, layout, space, type } from '@/theme/theme';

// Temporary screen body until each tab gets its feature change.
export function PlaceholderScreen({ title }: { title: string }) {
  const me = useMe();
  return (
    <View style={styles.root}>
      <Text accessibilityRole="header" style={[type.title, styles.title]}>
        {title}
      </Text>
      {__DEV__ && me ? (
        // Dev builds only: lets the Maestro flow check that the guest user survives a restart.
        <Text testID="dev-user-id" style={[type.caption, styles.dev]}>
          {me.id}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    paddingHorizontal: layout.sideMargin,
  },
  title: { color: colors.text },
  dev: { color: colors.subtle, marginTop: space[8] },
});
