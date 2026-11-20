import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Progress } from '@/api/client';
import { api } from '@/auth/boot';
import { useMe } from '@/auth/me-store';
import { Icon } from '@/components/icon';
import { LoadError, Loading } from '@/components/load-state';
import { colors, layout, radius, space, type } from '@/theme/theme';

// Progress tab (Figma P1): the word bank total and the way to the decks. The grid, the goal and the meadows come next.
export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const [state, setState] = useState<{ progress: Progress | null; failed: boolean }>({ progress: null, failed: false });
  // Loads every time the tab comes into view: a round or a new deck changes the numbers.
  const load = useCallback(() => {
    api.fetchProgress().then(
      (progress) => setState({ progress, failed: false }),
      () => setState({ progress: null, failed: true }),
    );
  }, []);
  useFocusEffect(load);

  const { progress, failed } = state;
  return (
    <View style={[styles.root, { paddingTop: insets.top + space[48] }]}>
      {failed ? (
        <LoadError
          message="Could not load your progress."
          onRetry={() => {
            setState({ progress: null, failed: false });
            load();
          }}
        />
      ) : !progress ? (
        <Loading label="Loading your progress…" />
      ) : (
        <>
          <Text accessibilityRole="header" style={[type.display, styles.ink]}>
            {progress.total}
          </Text>
          <Text style={[type.body, styles.muted]}>{progress.total === 1 ? 'word in your word bank' : 'words in your word bank'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`${progress.decks} ${progress.decks === 1 ? 'Deck' : 'Decks'}`} onPress={() => router.push('/decks')} style={styles.decks}>
            <Icon name="deck" size={24} color={colors.greenText} />
            <Text style={[type.headline, styles.green]}>{`${progress.decks} ${progress.decks === 1 ? 'Deck' : 'Decks'}`}</Text>
            <Icon name="next" size={16} color={colors.greenText} />
          </Pressable>
        </>
      )}
      {__DEV__ && me ? (
        // Dev builds only: lets the Maestro flows check that the guest user survives a restart.
        <Text testID="dev-user-id" style={[type.caption, styles.dev]}>
          {me.id}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: colors.canvas, paddingHorizontal: layout.sideMargin, paddingBottom: layout.tabBarClearance, gap: space[8] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  green: { color: colors.greenText },
  decks: { marginTop: space[16], height: 52, flexDirection: 'row', alignItems: 'center', gap: space[12], paddingHorizontal: space[24], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.button, backgroundColor: colors.greenBg },
  dev: { color: colors.subtle },
});
