import { fonts } from '@/theme/fonts';
import { type } from '@/theme/theme';

// A text style that names a font we never load falls back to the system font without any error.
test.each(Object.entries(type))('text style %s uses a loaded font', (_name, style) => {
  expect(Object.keys(fonts)).toContain(style.fontFamily);
});

// With custom fonts the weight lives in the font file; fontWeight would make iOS fake a bold.
test.each(Object.entries(type))('text style %s sets no fontWeight', (_name, style) => {
  expect(style).not.toHaveProperty('fontWeight');
});
