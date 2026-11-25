import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_600SemiBold } from '@expo-google-fonts/vazirmatn';
import {
  MonaSans_400Regular,
  MonaSans_500Medium,
  MonaSans_600SemiBold,
} from '@expo-google-fonts/mona-sans';

// Every font file the app loads at start. Keys are the fontFamily names used in theme.ts.
// One family per weight: custom fonts ignore fontWeight on Android and fake bold on iOS.
export const fonts = {
  MonaSans_400Regular,
  MonaSans_500Medium,
  MonaSans_600SemiBold,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
  // Persian, Arabic and every other language in the Arabic script (src/theme/script-font.ts).
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
};
