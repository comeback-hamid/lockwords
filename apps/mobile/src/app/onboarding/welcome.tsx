import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { QuestionScreen } from '@/components/question-screen';
import { colors, levelColors, lift, radius, space, type } from '@/theme/theme';

// O2 Welcome: the lock-screen hook.
export default function WelcomeScreen() {
  const router = useRouter();
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
        <View style={styles.phone}>
          <View style={styles.island} />
          <Text style={[type.callout, styles.date]}>Friday, October 31</Text>
          <Text style={[type.clock, styles.ink]}>9:41</Text>
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={[type.labelTag, styles.muted]}>LOCKWORDS</Text>
              <View style={styles.cardSquare} />
            </View>
            <View style={styles.cardWord}>
              <Text style={[type.headline, styles.ink]}>la cuenta</Text>
              <Text style={[type.callout, styles.muted]}>the bill</Text>
            </View>
          </View>
        </View>
        <View style={styles.ground} />
        <Image source={require('../../../assets/kai/kai-greeting.svg')} style={styles.kai} contentFit="contain" accessibilityLabel="Kai" />
      </View>
      <View style={styles.copy}>
        <Text style={[type.title, styles.ink, styles.center]}>{'Your words,\non your lock screen.'}</Text>
        <Text style={[type.body, styles.muted, styles.center]}>Learn a word every time you unlock.</Text>
      </View>
    </QuestionScreen>
  );
}

const styles = StyleSheet.create({
  ink: { color: colors.text },
  muted: { color: colors.muted },
  center: { textAlign: 'center' },
  logo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[8], marginTop: -space[24] },
  logoMark: { width: 24, height: 24 },
  logoBack: { position: 'absolute', left: 0, top: 0, width: 16, height: 16, borderRadius: 4, backgroundColor: colors.text },
  logoFront: { position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, borderRadius: 4, backgroundColor: levelColors[3] },
  phone: {
    marginHorizontal: 40,
    height: 330,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    borderWidth: 6,
    borderBottomWidth: 0,
    borderColor: colors.text,
    backgroundColor: colors.chip,
    alignItems: 'center',
    paddingTop: space[12],
    overflow: 'hidden',
  },
  island: { width: 82, height: 24, borderRadius: radius.pill, backgroundColor: colors.black, marginBottom: space[16] },
  date: { color: colors.text2 },
  card: { alignSelf: 'stretch', marginHorizontal: space[16], marginTop: space[16], padding: space[12], gap: space[4], borderRadius: radius.sheet, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, ...lift, shadowOpacity: 0.08 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardSquare: { width: 12, height: 12, borderRadius: 3, backgroundColor: levelColors[1] },
  cardWord: { flexDirection: 'row', alignItems: 'baseline', gap: space[8] },
  ground: { height: 1, backgroundColor: colors.line },
  kai: { position: 'absolute', right: 0, bottom: -4, width: 72, height: 56 },
  copy: { gap: space[8] },
});
