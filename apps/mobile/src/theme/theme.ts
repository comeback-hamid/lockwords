// Design tokens. Source: Figma variables (file cRusagDF0itPxGEvDtr44K, page Foundations), read 2026-11-16.
// Rule: screens use these values only. No raw colors or sizes in components.

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
  white: '#ffffff',
  black: '#000000',
} as const;

// Word level square: New + Stage 1..5.
export const levelColors = ['#eff2f5', '#aceebb', '#6fdd8b', '#4ac26b', '#2da44e', '#116329'] as const;

export const space = { 4: 4, 8: 8, 12: 12, 16: 16, 24: 24, 32: 32, 48: 48 } as const;

export const radius = { badge: 6, control: 12, sheet: 16, card: 20, pill: 999 } as const;

export const layout = {
  frameWidth: 393,
  sideMargin: 20,
  buttonHeight: 56,
  minTapTarget: 44,
  kaiHeaderHeight: 176,
} as const;

// Figma "lift": only on cards and sheets. Everything else uses a 1px line.
export const lift = {
  shadowColor: '#1f2328',
  shadowOpacity: 0.22,
  shadowRadius: 32,
  shadowOffset: { width: 0, height: 12 },
} as const;

const sans = 'Mona Sans';
const mono = 'JetBrains Mono';

// letterSpacing in Figma is a percent of font size; here it is in points.
export const type = {
  display: { fontFamily: sans, fontSize: 96, lineHeight: 100, fontWeight: '600', letterSpacing: -3.84 },
  wordXL: { fontFamily: sans, fontSize: 44, lineHeight: 52, fontWeight: '600' },
  title: { fontFamily: sans, fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.28 },
  headline: { fontFamily: sans, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  body: { fontFamily: sans, fontSize: 17, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontFamily: sans, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  callout: { fontFamily: sans, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  calloutMedium: { fontFamily: sans, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  caption: { fontFamily: sans, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  captionStrong: { fontFamily: sans, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  button: { fontFamily: sans, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  tab: { fontFamily: sans, fontSize: 11, lineHeight: 13, fontWeight: '500' },
  tabActive: { fontFamily: sans, fontSize: 11, lineHeight: 13, fontWeight: '600' },
  label: { fontFamily: mono, fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.72 },
  labelTag: { fontFamily: mono, fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 0.66 },
  badge: { fontFamily: mono, fontSize: 12, lineHeight: 16, fontWeight: '500' },
  score: { fontFamily: mono, fontSize: 36, lineHeight: 44, fontWeight: '500' },
  stamp: { fontFamily: mono, fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: 1.6 },
  clock: { fontFamily: mono, fontSize: 64, lineHeight: 72, fontWeight: '500', letterSpacing: -1.28 },
} as const;
