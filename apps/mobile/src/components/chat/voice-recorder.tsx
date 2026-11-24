import { RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, radius, space, type } from '@/theme/theme';

import { clock, level, MAX_RECORDING_MS, pushLevel, WAVE_BARS } from './voice';

const LEVEL_MS = 80;
const BAR_MIN = 3;
const BAR_MAX = 28;

// The chat box while the learner speaks (like Telegram): X on the left throws the recording away, the wave of
// their voice moves in the middle, Stop on the right ends it and hands the file over to be written as text.
// It starts recording when it is shown. The mic permission is asked before (Composer).
export function VoiceRecorder({ onCancel, onStop }: { onCancel(): void; onStop(uri: string | null): void }) {
  const recorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, numberOfChannels: 1, isMeteringEnabled: true });
  const [levels, setLevels] = useState<number[]>([]);
  const [durationMillis, setDuration] = useState(0);
  const ended = useRef(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        if (live) recorder.record();
      } catch {
        if (live) onStop(null);
      }
    })();
    return () => {
      live = false;
      // The phone's speaker is free again for the word's sound.
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    };
    // Once, when the recorder is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const end = async (keep: boolean) => {
    if (ended.current) return;
    ended.current = true;
    try {
      await recorder.stop();
    } catch {
      // nothing was recorded
    }
    if (keep) onStop(recorder.uri);
    else onCancel();
  };

  // The wave and the clock: the recorder is asked for its level a few times a second.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = recorder.getStatus();
      if (!now.isRecording) return;
      setDuration(now.durationMillis);
      setLevels((l) => pushLevel(l, level(now.metering)));
    }, LEVEL_MS);
    return () => clearInterval(timer);
  }, [recorder]);
  useEffect(() => {
    if (durationMillis >= MAX_RECORDING_MS) void end(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMillis]);

  const bars = [...Array<number>(Math.max(0, WAVE_BARS - levels.length)).fill(0), ...levels];
  return (
    <View style={styles.row} accessibilityLabel="Recording your voice">
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel recording" onPress={() => void end(false)} style={styles.round}>
        <Icon name="close" color={colors.text2} />
      </Pressable>
      <View style={styles.wave}>
        {bars.map((v, i) => (
          <View key={i} style={[styles.bar, { height: BAR_MIN + v * (BAR_MAX - BAR_MIN) }]} />
        ))}
      </View>
      <Text style={[type.label, styles.time]}>{clock(durationMillis)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Stop recording" onPress={() => void end(true)} style={[styles.round, styles.stop]}>
        <View style={styles.square} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[8] },
  round: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chip },
  stop: { backgroundColor: colors.hard },
  square: { width: 12, height: 12, borderRadius: 2, backgroundColor: colors.white },
  wave: { flex: 1, height: BAR_MAX, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors.button },
  time: { color: colors.muted, minWidth: 34, textAlign: 'right' },
});
