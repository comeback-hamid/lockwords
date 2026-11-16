import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Profile } from '@/api/client';
import { api } from '@/auth/boot';
import { Icon, type IconName } from '@/components/icon';
import { QuestionScreen } from '@/components/question-screen';
import { profileBody, stepFor } from '@/onboarding/flow';
import { getAnswers, setAnswers } from '@/onboarding/store';
import { colors, levelColors, radius, space, type } from '@/theme/theme';

type Interest = Profile['interests'][number];
const INTERESTS: { value: Interest; label: string; icon: IconName }[] = [
  { value: 'food', label: 'Food', icon: 'food' },
  { value: 'travel', label: 'Travel', icon: 'travel' },
  { value: 'work', label: 'Work', icon: 'work' },
  { value: 'business', label: 'Business', icon: 'business' },
  { value: 'tech', label: 'Tech', icon: 'tech' },
  { value: 'science', label: 'Science', icon: 'science' },
  { value: 'music', label: 'Music', icon: 'music' },
  { value: 'movies', label: 'Movies', icon: 'movies' },
  { value: 'books', label: 'Books', icon: 'books' },
  { value: 'sports', label: 'Sports', icon: 'sports' },
  { value: 'fitness', label: 'Fitness', icon: 'fitness' },
  { value: 'health', label: 'Health', icon: 'health' },
  { value: 'nature', label: 'Nature', icon: 'nature' },
  { value: 'animals', label: 'Animals', icon: 'animals' },
  { value: 'art', label: 'Art', icon: 'art' },
  { value: 'fashion', label: 'Fashion', icon: 'fashion' },
  { value: 'gaming', label: 'Gaming', icon: 'gaming' },
  { value: 'news', label: 'News', icon: 'news' },
  { value: 'family', label: 'Family', icon: 'family' },
  { value: 'friends_dating', label: 'Friends & dating', icon: 'friends' },
  { value: 'shopping', label: 'Shopping', icon: 'shopping' },
  { value: 'cooking', label: 'Cooking', icon: 'cooking' },
  { value: 'money', label: 'Money', icon: 'money' },
  { value: 'culture', label: 'Culture', icon: 'culture' },
];

// O9 Interests. Continue saves the whole profile, then the Kai chat starts.
export default function InterestsScreen() {
  const router = useRouter();
  const [picked, setPicked] = useState<Interest[]>(getAnswers().interests);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    setAnswers({ interests: picked });
    setSaving(true);
    setFailed(false);
    try {
      await api.saveProfile(profileBody(getAnswers()));
      router.push('/onboarding/kai'); // onboarding is marked finished at the end of the Kai chat
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuestionScreen
      step={stepFor('interests')}
      title="What are you into?"
      message={failed ? 'Could not save. Try again.' : undefined}
      button={{ label: 'Continue', disabled: picked.length === 0 || saving, onPress: save }}>
      <View style={styles.group}>
        <Text style={[type.label, styles.count]}>{`${picked.length} SELECTED`}</Text>
        <View style={styles.grid}>
          {INTERESTS.map((it) => {
            const on = picked.includes(it.value);
            return (
              <Pressable
                key={it.value}
                accessibilityRole="checkbox"
                accessibilityLabel={it.label}
                accessibilityState={{ checked: on }}
                onPress={() => setPicked(on ? picked.filter((v) => v !== it.value) : [...picked, it.value])}
                style={[styles.tile, on && styles.tileOn]}>
                {on ? (
                  <View style={styles.check}>
                    <Icon name="check" color={colors.white} />
                  </View>
                ) : null}
                <Icon name={it.icon} size={24} color={on ? colors.greenText : colors.text2} />
                <Text numberOfLines={1} adjustsFontSizeToFit style={[type.callout, { color: on ? colors.greenText : colors.text }]}>
                  {it.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </QuestionScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[12], marginTop: -space[8] },
  count: { color: colors.greenText },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  // Three columns: (100% - 2 gaps) / 3.
  tile: { width: '31.6%', height: 88, alignItems: 'center', justifyContent: 'center', gap: space[8], paddingHorizontal: space[4], borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  tileOn: { borderColor: levelColors[3], backgroundColor: colors.greenBg },
  check: { position: 'absolute', top: space[8], right: space[8], width: 18, height: 18, borderRadius: radius.pill, backgroundColor: colors.button, alignItems: 'center', justifyContent: 'center' },
});
