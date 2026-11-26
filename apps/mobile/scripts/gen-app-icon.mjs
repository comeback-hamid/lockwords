// Makes the app icon: two word cards, a dark one on top of a green one, on white (Hamid's sketch, 2026-11-25).
// Run: npm run icon:app
// iOS gets three looks (light, dark, tinted); iOS draws the corners and, for dark and tinted, the background.
// Also the favicon and the web app's icons (public/icons). Android's adaptive icon files are not made here.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.ICON_OUT ?? join(root, 'assets/images');
const SIZE = 1024;
const CARD = 480; // one card's side
const STEP = 210; // how far the green card sits down and to the right of the dark one
const RADIUS = 110;
const START = (SIZE - CARD - STEP) / 2; // the pair sits in the middle
const INK = '#1f2328'; // theme text
const GREEN = '#4ac26b'; // level 3 green

const card = (at, fill) => `<rect x="${at}" y="${at}" width="${CARD}" height="${CARD}" rx="${RADIUS}" fill="${fill}"/>`;
/** The green card behind, the other card on top. */
const cards = (top, back) => card(START + STEP, back) + card(START, top);
const svg = (inside) => `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${inside}</svg>`;

const light = svg(`<rect width="${SIZE}" height="${SIZE}" fill="#ffffff"/>${cards(INK, GREEN)}`);
// Dark: see-through, iOS puts its own dark background behind. A dark card would vanish there, so the top card is white.
const dark = svg(cards('#ffffff', GREEN));
// Tinted: iOS colors the picture by brightness. The top card is white, the card behind is grey.
const tinted = svg(cards('#ffffff', '#8c8c8c'));

const png = (source) => sharp(Buffer.from(source)).png().toBuffer();
const flat = await sharp(await png(light)).flatten({ background: '#ffffff' }).png().toBuffer();
writeFileSync(join(out, 'icon.png'), flat);
writeFileSync(join(out, 'icon-dark.png'), await png(dark));
writeFileSync(join(out, 'icon-tinted.png'), await png(tinted));
writeFileSync(join(out, 'favicon.png'), await sharp(flat).resize(48, 48).png().toBuffer());
// The web app's icons (a phone's home screen, the install prompt): the light look, with no see-through part.
if (!process.env.ICON_OUT) {
  for (const [name, size] of [['apple-touch-icon', 180], ['icon-192', 192], ['icon-512', 512]]) {
    writeFileSync(join(root, `public/icons/${name}.png`), await sharp(flat).resize(size, size).png().toBuffer());
  }
}
console.log('wrote icon.png, icon-dark.png, icon-tinted.png, favicon.png and the web icons');
