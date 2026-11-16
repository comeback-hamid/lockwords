import { StyleSheet, Text, View } from 'react-native';

import { colors, layout, type } from '@/theme/theme';

// Temporary screen body until each tab gets its feature change.
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.root}>
      <Text accessibilityRole="header" style={[type.title, styles.title]}>
        {title}
      </Text>
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
});
