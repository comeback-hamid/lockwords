import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LockPhone } from '@/components/lock-phone';
import { QuestionScreen } from '@/components/question-screen';
import { Kai } from '@/kai/kai';
import { colors, levelColors, space, type } from '@/theme/theme';

// O2 Welcome: the lock-screen hook. Kai waves when it opens, and again when tapped.
export default function WelcomeScreen() {
  const router = useRouter();
  const [waves, setWaves] = useState(0);
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
        <LockPhone word="la cuenta" translation="the bill" height={330} />
        <View style={styles.kai}>
          <Kai state="greeting" playKey={waves} size={KAI_WIDTH} onPress={() => setWaves((n) => n + 1)} />
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={[type.title, styles.ink, styles.center]}>{'Your words,\non your lock screen.'}</Text>
        <Text style={[type.body, styles.muted, styles.center]}>Learn a word every time you unlock.</Text>
      </View>
    </QuestionScreen>
  );
}

const KAI_WIDTH = 84;

const styles = StyleSheet.create({
  ink: { color: colors.text },
  muted: { color: colors.muted },
  center: { textAlign: 'center' },
  logo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8], marginTop: -space[24] },
  logoMark: { width: 24, height: 24 },
  logoBack: { position: 'absolute', left: 0, top: 0, width: 16, height: 16, borderRadius: 4, backgroundColor: colors.text },
  logoFront: { position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, borderRadius: 4, backgroundColor: levelColors[3] },
  kai: { position: 'absolute', right: 0, bottom: -4 },
  copy: { gap: space[8] },
});
