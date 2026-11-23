import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { LockPhone } from '@/components/lock-phone';
import { QuestionScreen } from '@/components/question-screen';
import { Kai } from '@/kai/kai';
import { useWaves } from '@/kai/use-waves';
import { sampleWord } from '@/onboarding/sample-word';
import { useAnswers } from '@/onboarding/store';
import { colors, levelColors, space, type } from '@/theme/theme';

// O2 Welcome: the lock-screen hook. A big Kai waves when it opens, again every few seconds, and when tapped.
// The word on the drawn lock screen is in the language the learner just picked.
export default function WelcomeScreen() {
  const router = useRouter();
  const [waves, wave] = useWaves();
  const { learning, speaks } = useAnswers();
  const sample = sampleWord(learning, speaks);
  return (
    <QuestionScreen button={{ label: 'Get started', onPress: () => router.push('/onboarding/level') }}>
      <View style={styles.logo}>
        <View style={styles.logoMark}>
          <View style={styles.logoBack} />
          <View style={styles.logoFront} />
        </View>
        <Text style={[type.bodyStrong, styles.ink]}>Lockwords</Text>
      </View>
      <View>
        <LockPhone word={sample.word} translation={sample.translation} height={330} />
        <View style={styles.kai}>
          <Kai state="greeting" playKey={waves} size={KAI_WIDTH} onPress={wave} />
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={[type.title, styles.ink, styles.center]}>{'Your words,\non your lock screen.'}</Text>
        <Text style={[type.body, styles.muted, styles.center]}>Learn a word every time you unlock.</Text>
      </View>
    </QuestionScreen>
  );
}

// 6 points per Kai unit: twice the old size (Figma O2).
const KAI_WIDTH = 168;

const styles = StyleSheet.create({
  ink: { color: colors.text },
  muted: { color: colors.muted },
  center: { textAlign: 'center' },
  logo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8], marginTop: -space[24] },
  logoMark: { width: 24, height: 24 },
  logoBack: { position: 'absolute', left: 0, top: 0, width: 16, height: 16, borderRadius: 4, backgroundColor: colors.text },
  logoFront: { position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, borderRadius: 4, backgroundColor: levelColors[3] },
  kai: { position: 'absolute', right: -space[12], bottom: -4 },
  copy: { gap: space[8] },
});
