import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ReviewCard, ReviewSummary } from "@/api/client";
import RoundScreen from "@/app/review/round";
import { api } from "@/auth/boot";
import { useMe } from "@/auth/me-store";
import { ButtonPrimary } from "@/components/button";
import { LevelChain } from "@/components/level-chain";
import { LoadError, Loading } from "@/components/load-state";
import { Kai } from "@/kai/kai";
import { isIntroDone } from "@/review/intro";
import { addToRound, backFromUseIt, getRound, putFirst, setRound } from "@/review/round-store";
import { colors, layout, space, type } from "@/theme/theme";
import { syncWidget, useWidgetUrl } from "@/widgets/sync";
import { tapped, useTapped } from "@/widgets/tapped";

const KAI_SIZE = 168;
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

// Review tab: the start of today's round (A2), the round itself (A3–A7, the tab bar stays), or the done screen (A9).
export default function ReviewScreen() {
  const router = useRouter();
  const me = useMe();
  const [state, setState] = useState<{
    cards: ReviewCard[] | null;
    summary: ReviewSummary | null;
    failed: boolean;
  }>({ cards: null, summary: null, failed: false });
  const [inRound, setInRound] = useState(false);

  // Loads every time the tab comes into view, so a finished or left round shows what is true now.
  // `afterRound`: the round just ended here. Its (empty) screen stays until the new numbers are in, so the old
  // start screen does not flash by.
  const load = useCallback((afterRound = false) => {
    if (!afterRound) setInRound(false);
    void syncWidget(); // the hard words may have changed (a round, a removed word): the widget gets its new plan
    // The summary (name, streak, today's numbers) is an extra: without it the screen still works.
    const summary = Promise.resolve()
      .then(() => api.fetchSummary())
      .catch(() => null);
    Promise.all([api.fetchRound(), summary])
      .then(
        ([cards, s]) => setState({ cards, summary: s, failed: false }),
        () => setState({ cards: null, summary: null, failed: true }),
      )
      .then(() => setInRound(false));
  }, []);
  // A round that is open stays open (Hamid, 2026-11-25): coming back from another tab, from Use it or from outside
  // the app shows the same card, with the bar where it was. Words made meanwhile join at the end of the round.
  // Only when no round is open does the tab load again.
  const roundOpen = useRef(false);
  useEffect(() => {
    roundOpen.current = inRound;
  }, [inRound]);
  // A tap on the widget (Hamid, 2026-11-25): the round opens at once, with the tapped word as the first card.
  // With a round already open, the word is put on top of it.
  const opening = useRef(false);
  const openOn = useCallback((first: string) => {
    const { cards: inStore, index } = getRound();
    const open = roundOpen.current && index < inStore.length;
    opening.current = true;
    Promise.resolve()
      .then(() => api.fetchRound(undefined, first))
      .finally(() => (opening.current = false))
      .then(
        (cards) => {
          if (open) {
            if (cards[0]?.id === first) putFirst(cards[0]);
            return;
          }
          setRound(cards);
          setState((s) => ({ ...s, cards, failed: false }));
          setInRound(cards.length > 0);
        },
        () => {
          if (!open) setState({ cards: null, summary: null, failed: true });
        },
      );
  }, []);
  const tappedId = useTapped();
  useEffect(() => {
    const first = tapped.take();
    if (first) openOn(first);
  }, [tappedId, openOn]);
  const onFocus = useCallback(() => {
    if (opening.current) return; // the tapped word loads the round itself
    const fromUseIt = backFromUseIt();
    const { cards: inStore, index } = getRound();
    if (roundOpen.current && index < inStore.length) {
      if (!fromUseIt) void Promise.resolve().then(() => api.fetchRound()).then(addToRound, () => {});
      return;
    }
    if (fromUseIt) return;
    load();
  }, [load]);
  const onRoundDone = useCallback(() => load(true), [load]);
  const widgetUrl = useWidgetUrl();
  useFocusEffect(onFocus);

  async function start(cards: ReviewCard[]) {
    setRound(cards);
    // The very first round is the onboarding practice (Figma O12): full screen, no tab bar.
    if (await isIntroDone()) setInRound(true);
    else router.push("/review/round");
  }

  const { cards, summary, failed } = state;
  if (inRound) return <RoundScreen inTab onDone={onRoundDone} />;

  const n = cards?.length ?? 0;
  const today = summary?.today;
  const minutes = Math.max(1, Math.round(n / 4));
  return (
    <View style={styles.root}>
      <View style={styles.middle}>
        {failed ? (
          <LoadError
            message="Could not load your cards."
            onRetry={() => {
              setState({ cards: null, summary: null, failed: false });
              load();
            }}
          />
        ) : !cards ? (
          <Loading label="Loading your cards…" />
        ) : n ? (
          <>
            {/* Kai goes through flashcards (the `reviewing` state of the character spec). */}
            <Kai state="reviewing" size={KAI_SIZE} />
            <Text
              accessibilityRole="header"
              style={[type.title, styles.ink, styles.center, styles.afterKai]}
            >
              {`${plural(n, "card")} due today`}
            </Text>
            {/* Only the time, with the "about" sign (Hamid, 2026-11-25). */}
            <Text
              accessibilityLabel={`About ${plural(minutes, "minute")}`}
              style={[type.body, styles.muted, styles.center]}
            >{`~${minutes} min`}</Text>
            {/* The button sits with the text, not at the bottom of the screen. */}
            <View style={styles.start}>
              <ButtonPrimary label="Let’s start" onPress={() => void start(cards)} />
            </View>
          </>
        ) : summary && !today?.words ? (
          <>
            <Kai state="idle" size={KAI_SIZE} />
            <Text
              accessibilityRole="header"
              style={[type.title, styles.ink, styles.center, styles.afterKai]}
            >
              Nothing to review today
            </Text>
            <Text style={[type.body, styles.muted, styles.center]}>
              New words from Kai show up here.
            </Text>
          </>
        ) : (
          <>
            <Kai state="allDone" size={KAI_SIZE} />
            <Text
              accessibilityRole="header"
              style={[type.title, styles.ink, styles.center, styles.afterKai]}
            >
              All cards done
            </Text>
            <Text style={[type.body, styles.muted, styles.center]}>
              You reviewed every word due today. New reviews will be ready
              tomorrow.
            </Text>
            {today?.words ? (
              <>
                <Text
                  style={[type.callout, styles.muted, styles.center]}
                >{`${plural(today.words, "word")} · ${plural(today.minutes, "minute")}`}</Text>
                <LevelChain stages={today.stages} />
                <View
                  style={styles.counts}
                  accessible
                  accessibilityLabel={`${today.easy} easy, ${today.hard} hard, ${today.known} know it`}
                >
                  <Count n={today.easy} label="EASY" color={colors.greenText} />
                  <Count n={today.hard} label="HARD" color={colors.hard} />
                  <Count
                    n={today.known}
                    label="KNOW IT"
                    color={colors.greenText}
                  />
                </View>
              </>
            ) : null}
          </>
        )}
        {__DEV__ && widgetUrl ? (
          // Dev builds only: where a tap on the widget goes now (the Maestro flow opens this address).
          <Text testID="dev-widget-url" style={[type.caption, styles.dev]}>
            {widgetUrl}
          </Text>
        ) : null}
        {__DEV__ && me ? (
          // Dev builds only: lets the Maestro flows check that the guest user survives a restart.
          <Text testID="dev-user-id" style={[type.caption, styles.dev]}>
            {me.id}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Count({
  n,
  label,
  color,
}: {
  n: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.count}>
      <Text style={[type.bodyStrong, styles.ink]}>{n}</Text>
      <Text style={[type.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingHorizontal: layout.sideMargin,
    paddingBottom: layout.tabBarClearance + space[16],
  },
  middle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space[12],
  },
  afterKai: { marginTop: space[24] },
  start: { alignSelf: "stretch", marginTop: space[24] },
  counts: { flexDirection: "row", gap: space[24], marginTop: space[4] },
  count: { flexDirection: "row", alignItems: "baseline", gap: space[8] },
  ink: { color: colors.text },
  muted: { color: colors.muted },
  center: { textAlign: "center" },
  dev: { color: colors.subtle },
});
