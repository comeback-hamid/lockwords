import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ReviewCard } from '@/api/client';
import { api } from '@/auth/boot';
import { useMe } from '@/auth/me-store';
import { ButtonPrimary } from '@/components/button';
import { LoadError, Loading } from '@/components/load-state';
import { clearReviewDot } from '@/review/dot';
import { setRound } from '@/review/round-store';
import { colors, layout, space, type } from '@/theme/theme';

// Review tab: the start of today's round (A2) or "all done" (A9).
export default function ReviewScreen() {
  const router = useRouter();
  const me = useMe();
  const [state, setState] = useState<{ cards: ReviewCard[] | null; failed: boolean }>({ cards: null, failed: false });

  // Loads every time the tab comes into view, so a finished round shows "all done".
  const load = useCallback(() => {
    void clearReviewDot(); // the learner opened Review: the tab's red dot goes
    api.fetchRound().then(
      (cards) => setState({ cards, failed: false }),
      () => setState({ cards: null, failed: true }),
    );
  }, []);
  useFocusEffect(load);

  const { cards, failed } = state;
  const n = cards?.length ?? 0;
  return (
    <View style={styles.root}>
      <View style={styles.middle}>
        {failed ? (
          <LoadError
            message="Could not load your cards."
            onRetry={() => {
              setState({ cards: null, failed: false });
              load();
            }}
          />
        ) : !cards ? (
          <Loading label="Loading your cards…" />
        ) : (
          <>
            <Image source={n ? require('../../../assets/kai/kai-idle.svg') : require('../../../assets/kai/kai-celebrate.svg')} style={styles.kai} contentFit="contain" accessibilityLabel="Kai" />
            <Text accessibilityRole="header" style={[type.title, styles.ink, styles.center]}>
              {n ? `${n} ${n === 1 ? 'card' : 'cards'} to review today` : 'All done for today'}
            </Text>
            <Text style={[type.body, styles.muted, styles.center]}>
              {n ? `It takes about ${Math.max(1, Math.round(n / 4))} minutes. Let’s keep your words fresh 🌱` : 'Come back tomorrow for your next cards.'}
            </Text>
          </>
        )}
        {__DEV__ && me ? (
          // Dev builds only: lets the Maestro flows check that the guest user survives a restart.
          <Text testID="dev-user-id" style={[type.caption, styles.dev]}>
            {me.id}
          </Text>
        ) : null}
      </View>
      {n ? (
        <ButtonPrimary
          label="Let’s start"
          onPress={() => {
            setRound(cards ?? []);
            router.push('/review/round');
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: layout.sideMargin, paddingBottom: 110 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[12] },
  kai: { width: 168, height: 120, marginBottom: space[24] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  center: { textAlign: 'center' },
  dev: { color: colors.subtle },
});
