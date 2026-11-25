import { Platform, StyleSheet, type StyleProp, type TextStyle } from 'react-native';

// One font rule for every language (Hamid, 2026-11-25). The app's font, Mona Sans, has Latin letters only. Before
// this rule every other script fell back by accident: the wrong weight, and Persian in a font nobody picked.
//
// - Latin (English, Spanish, French, German, Italian, Portuguese, Turkish…): Mona Sans, as in Figma.
// - Arabic script (Persian, Arabic, Urdu…): Vazirmatn, the same three weights. It is made for Persian first and
//   also has Latin letters, so a mixed line stays in one font.
// - Every other script (Russian, Greek, Chinese, Japanese, Korean, Hebrew, Hindi, Thai…): the phone's own font for
//   that script, at the same weight. Those fonts are made by the phone's maker for exactly these scripts, and
//   bundling our own would add many megabytes per language.
export type Script = 'latin' | 'arabic' | 'other';

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﻼ]/;
// Letters of any script that Mona Sans does not have: Greek and Cyrillic up to the end of the old scripts, then
// Chinese, Japanese, Korean and their full-width forms. Signs, arrows and emoji are not letters.
const NOT_LATIN = /[Ͱ-᷿Ⰰ-ⷿ⺀-퟿豈-﫿＀-￯]/;

export const scriptOf = (text: string): Script => (ARABIC.test(text) ? 'arabic' : NOT_LATIN.test(text) ? 'other' : 'latin');

// Mona Sans weight → the same weight in the other fonts.
const WEIGHTS: Record<string, { arabic: string; weight: '400' | '500' | '600' }> = {
  MonaSans_400Regular: { arabic: 'Vazirmatn_400Regular', weight: '400' },
  MonaSans_500Medium: { arabic: 'Vazirmatn_500Medium', weight: '500' },
  MonaSans_600SemiBold: { arabic: 'Vazirmatn_600SemiBold', weight: '600' },
};
const SYSTEM_FONT = Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' });

// What to add to a text style so this text is drawn in the right font for its script. Nothing for Latin text and
// for styles that are not Mona Sans (the mono labels are always English).
export function fontFor(text: string, style: StyleProp<TextStyle>): TextStyle | null {
  const script = scriptOf(text);
  if (script === 'latin') return null;
  const family = StyleSheet.flatten(style)?.fontFamily;
  const match = family ? WEIGHTS[family] : undefined;
  if (!match) return null;
  // Letter spacing pulls joined letters apart, so it is off for these scripts.
  return script === 'arabic' ? { fontFamily: match.arabic, letterSpacing: 0 } : { fontFamily: SYSTEM_FONT, fontWeight: match.weight, letterSpacing: 0 };
}
