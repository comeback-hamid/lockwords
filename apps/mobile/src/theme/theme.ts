// Design tokens. Source: Figma variables (file HSABWihDUDlsVz85aixHiT, page Foundations), read 2026-11-16.
// Rule: screens use these values only. No raw colors or sizes in components.
import { Platform } from 'react-native';


export const colors = {
  canvas: '#f6f8fa',
  surface: '#ffffff',
  chip: '#eff2f5',
  line: '#d1d9e0',
  lineStrong: '#c5ced7',
  divider: '#e3e8ec',
  text: '#1f2328',
  text2: '#3d444d',
  muted: '#59636e',
  subtle: '#818b98',
  button: '#1f883d',
  buttonPressed: '#1c8139',
  greenText: '#116329',
  greenBg: '#dafbe1',
  hard: '#d1242f',
  hardTint: '#ffebe9',
  know: '#116329',
  knowTint: '#dafbe1',
  easy: '#1f883d',
  buttonEdge: 'rgba(31,35,40,0.15)',
  white: '#ffffff',
  black: '#000000',
} as const;

// Word level square: New + Stage 1..5.
export const levelColors = ['#eff2f5', '#aceebb', '#6fdd8b', '#4ac26b', '#2da44e', '#116329'] as const;

export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 24: 24, 32: 32, 48: 48 } as const;

// A control that cannot be used right now (Figma O9b: tiles once 5 are picked).
export const opacity = { disabled: 0.4 } as const;

export const radius = { badge: 6, control: 12, sheet: 16, card: 20, pill: 999 } as const;

export const layout = {
  frameWidth: 393,
  sideMargin: 20,
  buttonHeight: 56,
  minTapTarget: 44,
  kaiHeaderHeight: 176,
  // The iOS tab bar floats over the screen. A tab screen with a control at the bottom keeps this much room under it.
  // In a browser the tab bar is a normal bar under the screen, so nothing has to be kept free.
  tabBarClearance: Platform.OS === 'web' ? 0 : 92,
} as const;

// The word card (Figma: Flashcard, Flashcard · back, Flashcard · rules).
export const card = {
  pictureHeight: 177, // the same on the front and the back, so the flip does not jump
  wordMaxWidth: 219, // the word's text; the level square sits left of it
  wordLines: 3,
  wordSizes: [44, 36, 30, 24], // the first that fits; line height = size + wordLineGap
  wordLineGap: 8,
  levelSquare: 18,
  speakerFront: 40,
  speakerBack: 36,
  speakerInset: 10, // back: from the right edge
  peek: 12, // how far each card behind shows
  swipeDistance: 90, // the label is full here, and a release past it sends the card off
  flipMs: 350,
  flyMs: 220,
} as const;

// Figma "lift": only on cards and sheets. Everything else uses a 1px line.
export const lift = {
  shadowColor: '#1f2328',
  shadowOpacity: 0.22,
  shadowRadius: 32,
  shadowOffset: { width: 0, height: 12 },
} as const;


// Font names are the keys of `fonts` (src/theme/fonts.ts); the weight is in the name.
// letterSpacing in Figma is a percent of font size; here it is in points.
export const type = {
  display: { fontFamily: 'MonaSans_600SemiBold', fontSize: 96, lineHeight: 100, letterSpacing: -3.84 },
  wordXL: { fontFamily: 'MonaSans_600SemiBold', fontSize: 44, lineHeight: 52 },
  title: { fontFamily: 'MonaSans_600SemiBold', fontSize: 28, lineHeight: 34, letterSpacing: -0.28 },
  headline: { fontFamily: 'MonaSans_600SemiBold', fontSize: 22, lineHeight: 28 },
  body: { fontFamily: 'MonaSans_400Regular', fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: 'MonaSans_600SemiBold', fontSize: 17, lineHeight: 24 },
  callout: { fontFamily: 'MonaSans_400Regular', fontSize: 15, lineHeight: 22 },
  calloutMedium: { fontFamily: 'MonaSans_500Medium', fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: 'MonaSans_400Regular', fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: 'MonaSans_600SemiBold', fontSize: 13, lineHeight: 18 },
  button: { fontFamily: 'MonaSans_600SemiBold', fontSize: 17, lineHeight: 22 },
  tab: { fontFamily: 'MonaSans_500Medium', fontSize: 11, lineHeight: 13 },
  tabActive: { fontFamily: 'MonaSans_600SemiBold', fontSize: 11, lineHeight: 13 },
  label: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, lineHeight: 16, letterSpacing: 0.72 },
  labelTag: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, lineHeight: 16, letterSpacing: 0.66 },
  badge: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, lineHeight: 16 },
  score: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 36, lineHeight: 44 },
  stamp: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 40, lineHeight: 48, letterSpacing: 1.6 },
  // The big time on a drawn lock screen (O2 Welcome phone, widgets page).
  lockClock: { fontFamily: 'MonaSans_500Medium', fontSize: 64, lineHeight: 72, letterSpacing: -1.28 },
  clock: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 64, lineHeight: 72, letterSpacing: -1.28 },
} as const;
