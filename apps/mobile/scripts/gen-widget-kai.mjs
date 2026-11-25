// Makes Kai's still poses for the widget from assets/kai/*.svg. Run: npm run widget:kai
// Lock screen widgets have no color: iOS keeps only how bright a pixel is. So Kai is white, the eyes and mouth
// are cut out (see-through), and the ground shadow is left out. One PNG per pose, all the same size (372×264: 62×44 points with room to spare), so Kai never jumps between poses.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSES = ['greeting', 'idle', 'thinking', 'speaking', 'celebrate'];
const INK = '#1f2328'; // eyes and mouth
const W = 372;
const H = 264;

export function monoSvg(svg) {
  const noShadow = svg.replace(/<ellipse[^>]*\/>\s*/g, '');
  const face = [...noShadow.matchAll(/<rect[^>]*fill="#1f2328"[^>]*\/>/g)].map((m) => m[0]);
  const body = noShadow.replace(/<rect[^>]*fill="#1f2328"[^>]*\/>\s*/g, '').replace(/fill="#[0-9a-f]{6}"/gi, 'fill="#ffffff"');
  return { body, face: face.length ? noShadow.replace(/<rect(?![^>]*fill="#1f2328")[^>]*\/>\s*/g, '').replace(new RegExp(`fill="${INK}"`, 'g'), 'fill="#ffffff"') : null };
}

mkdirSync(join(root, 'assets/widget'), { recursive: true });
for (const pose of POSES) {
  const { body, face } = monoSvg(readFileSync(join(root, `assets/kai/kai-${pose}.svg`), 'utf8'));
  let image = sharp(Buffer.from(body), { density: 72 * 3 }).resize(W, H);
  // The face is punched out of the body: where the face is drawn, the body becomes see-through.
  if (face) image = image.composite([{ input: await sharp(Buffer.from(face), { density: 72 * 3 }).resize(W, H).png().toBuffer(), blend: 'dest-out' }]);
  const png = await image.png().toBuffer();
  writeFileSync(join(root, `assets/widget/kai-mono-${pose}.png`), png);
  const meta = await sharp(png).metadata();
  console.log(`kai-mono-${pose}.png ${meta.width}×${meta.height}`);
}
