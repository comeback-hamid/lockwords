import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { FadeIn } from '@/components/fade-in';
import { QuestionScreen } from '@/components/question-screen';
import { Kai } from '@/kai/kai';
import { useWaves } from '@/kai/use-waves';
import { colors, space, type } from '@/theme/theme';

// O0 Hello: the first screen of a fresh install, after the splash. A very big Kai waves and says who it is.
export default function HelloScreen() {
  const router = useRouter();
  const [waves, wave] = useWaves();
  return (
    <QuestionScreen back={false} button={{ label: 'Start', onPress: () => router.push('/onboarding/learning') }}>
      <View style={styles.kai}>
        <Kai state="greeting" playKey={waves} size={KAI_WIDTH} onPress={wave} />
      </View>
      <FadeIn delay={250}>
        <Text accessibilityRole="header" accessibilityLabel="I’m Kai, welcome to Lockwords" style={[type.title, styles.title]}>
          {'I’m Kai,\nwelcome to Lockwords'}
        </Text>
      </FadeIn>
    </QuestionScreen>
  );
}

// 11 points per Kai unit (the spec's view box is 28 wide): whole points keep the pixels crisp.
const KAI_WIDTH = 308;

const styles = StyleSheet.create({
  kai: { alignItems: 'center', marginTop: space[48] + space[16] },
  title: { color: colors.text, textAlign: 'center' },
});
