// Writes Android's own pictures (iOS and the web get theirs from scripts/gen-app-icon.mjs). Run: npm run android-icon:gen
// 1. The launcher icon: the app icon's two word cards (a dark card on top of a green one, Hamid's sketch, 2026-11-25),
//    as an "adaptive icon": a see-through front picture over a white background. Android cuts the icon to its own
//    shape (circle, squircle…), so the cards stay inside the middle 61 % of the picture, the part every shape keeps.
// 2. The themed icon (Android 13+): the same cards in one color, the system tints them.
// 3. The splash picture: Kai from assets/kai/kai-idle.svg. Android cuts the splash to a circle, so the iOS picture
//    with the name under Kai does not fit; Kai alone does. No picture tools needed for it: Kai is only rectangles.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import sharp from 'sharp';

const SIZE = 1024;
const UNIT = 30; // one Kai block in pixels: Kai is 18 blocks wide = 540 px, inside the 624 px safe zone
const svg = readFileSync(new URL('../assets/kai/kai-idle.svg', import.meta.url), 'utf8');
const rects = [...svg.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="(#[0-9a-f]{6})"/g)].map((m) => ({
  x: +m[1], y: +m[2], w: +m[3], h: +m[4], fill: m[5],
}));
if (rects.length < 10) throw new Error('kai-idle.svg has no rectangles to draw');
const minX = Math.min(...rects.map((r) => r.x));
const maxX = Math.max(...rects.map((r) => r.x + r.w));
const minY = Math.min(...rects.map((r) => r.y));
const maxY = Math.max(...rects.map((r) => r.y + r.h));
const left = Math.round((SIZE - (maxX - minX) * UNIT) / 2);
const top = Math.round((SIZE - (maxY - minY) * UNIT) / 2);
const EYES = '#1f2328';

// paint(rect) → [r, g, b, a] or null (leave the pixel clear)
function draw(paint) {
  const px = Buffer.alloc(SIZE * SIZE * 4);
  for (const r of rects) {
    const color = paint(r);
    const x0 = left + Math.round((r.x - minX) * UNIT);
    const y0 = top + Math.round((r.y - minY) * UNIT);
    const x1 = x0 + Math.round(r.w * UNIT);
    const y1 = y0 + Math.round(r.h * UNIT);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) (color ?? [0, 0, 0, 0]).forEach((v, i) => (px[(y * SIZE + x) * 4 + i] = v));
  }
  return px;
}

function png(px) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc(body), body.length + 4);
    return out;
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(SIZE, 0);
  head.writeUInt32BE(SIZE, 4);
  head.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA
  const rows = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) px.copy(rows, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const out = (name, px) => writeFileSync(new URL(`../assets/images/${name}`, import.meta.url), png(px));
out('splash-android.png', draw((r) => [...rgb(r.fill), 255]));

// The two cards, with the measures of scripts/gen-app-icon.mjs made smaller to fit the safe zone:
// the pair is 480 px wide (690 px in the iOS icon), so its rounded corners stay inside a circle of 61 %.
const K = 480 / 690;
const CARD = 480 * K; // one card's side
const STEP = 210 * K; // how far the green card sits down and to the right of the dark one
const RADIUS = 110 * K;
const START = (SIZE - CARD - STEP) / 2;
const card = (at, fill, opacity = 1) => `<rect x="${at}" y="${at}" width="${CARD}" height="${CARD}" rx="${RADIUS}" fill="${fill}" fill-opacity="${opacity}"/>`;
const picture = (inside) => `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${inside}</svg>`;
const write = async (name, inside) => writeFileSync(new URL(`../assets/images/${name}`, import.meta.url), await sharp(Buffer.from(picture(inside))).png().toBuffer());
await write('android-icon-foreground.png', card(START + STEP, '#4ac26b') + card(START, '#1f2328'));
// One color: the card behind is half as strong, so the two cards still read as two.
await write('android-icon-monochrome.png', card(START + STEP, '#000000', 0.5) + card(START, '#000000'));
console.log('wrote the Android icon (two cards: foreground and monochrome) and the Android splash (Kai)');
