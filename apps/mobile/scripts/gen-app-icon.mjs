// Makes the app icon from Kai's own drawing (assets/kai/kai-greeting.svg). Run: npm run icon:app
// iOS gets three looks (light, dark, tinted); iOS draws the corners and, for dark and tinted, the background.
// Also the favicon and the web app's icons (public/icons). Android's adaptive icon files are not made here.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.ICON_OUT ?? join(root, 'assets/images');
const SIZE = 1024;
const UNIT = 38; // one Kai pixel on the 1024 icon; Kai is 18 wide, so 684 across
const kai = readFileSync(join(root, 'assets/kai/kai-greeting.svg'), 'utf8')
  .replace(/<\/?svg[^>]*>/g, '')
  .replace(/<ellipse[^>]*\/>\s*/g, ''); // no ground shadow: the icon is not a ground

/** Kai in the middle of a square. Kai's box is x 0..18, y -2.5..10.5, so its middle is (9, 4). */
const kaiAt = (body) => `<g shape-rendering="crispEdges" transform="translate(${SIZE / 2} ${SIZE / 2 - 14}) scale(${UNIT}) translate(-9 -4)">${body}</g>`;
const svg = (inside) => `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${inside}</svg>`;

const light = svg(
  `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0fff4"/><stop offset="1" stop-color="#aceebb"/></linearGradient></defs>` +
    `<rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>${kaiAt(kai)}`,
);
const dark = svg(kaiAt(kai)); // see-through: iOS puts its own dark background behind
// Tinted: iOS colors the picture by brightness, so Kai is white and the face is a darker grey.
const tinted = svg(kaiAt(kai.replace(/fill="#1f2328"/g, 'fill="#5a5a5a"').replace(/fill="#(?!5a5a5a)[0-9a-f]{6}"/gi, 'fill="#ffffff"')));

const png = (source) => sharp(Buffer.from(source)).png().toBuffer();
writeFileSync(join(out, 'icon.png'), await sharp(await png(light)).flatten({ background: '#aceebb' }).png().toBuffer());
writeFileSync(join(out, 'icon-dark.png'), await png(dark));
writeFileSync(join(out, 'icon-tinted.png'), await png(tinted));
writeFileSync(join(out, 'favicon.png'), await sharp(await png(light)).resize(48, 48).png().toBuffer());
// The web app's icons (a phone's home screen, the install prompt): the light look, with no see-through part.
if (!process.env.ICON_OUT) {
  const flat = await sharp(await png(light)).flatten({ background: '#aceebb' }).png().toBuffer();
  for (const [name, size] of [['apple-touch-icon', 180], ['icon-192', 192], ['icon-512', 512]]) {
    writeFileSync(join(root, `public/icons/${name}.png`), await sharp(flat).resize(size, size).png().toBuffer());
  }
}
console.log('wrote icon.png, icon-dark.png, icon-tinted.png, favicon.png and the web icons');
