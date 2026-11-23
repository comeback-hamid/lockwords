import sharp from 'sharp';

// AI task: the pictures of a deck. One image call draws every word of the deck as a grid on ONE sheet (Hamid, 2026-11-23:
// cheaper and faster than one call per card); the server then cuts the sheet into one picture per card (decks/cut-sheet.ts).
// Tried against the real API on 2026-11-23: 10 pictures in 21 s, 30 pictures in 28 s, the grid was exact both times.

export type PictureItem = { word: string; translation: string; pictureHint?: string | null };
export type Grid = { cols: number; rows: number };
export type SheetMaker = { sheet(items: PictureItem[], grid: Grid): Promise<Buffer> };

// A landscape sheet: the widest size the image API has.
export const SHEET = { width: 1536, height: 1024 } as const;
// One sheet holds a whole deck (the biggest deck has 30 words): decided by Hamid on 2026-11-23, for the cost. A lower
// number means more, smaller sheets made at the same time: sharper pictures and progress in steps, for more money.
export const MAX_PER_SHEET = 30;
const GRIDS: Grid[] = [{ cols: 4, rows: 3 }, { cols: 5, rows: 4 }, { cols: 6, rows: 5 }];

export function gridFor(n: number): Grid {
  return GRIDS.find((g) => g.cols * g.rows >= n) ?? GRIDS.at(-1)!;
}

// How many items go on each sheet. Sheets are as even as they can be.
export function sheetSizes(n: number, max = MAX_PER_SHEET): number[] {
  const sheets = Math.max(1, Math.ceil(n / max));
  return Array.from({ length: sheets }, (_, i) => Math.floor(n / sheets) + (i < n % sheets ? 1 : 0));
}

// docs/design/ILLUSTRATION-STYLE.md, word for word (a test compares them).
export const ILLUSTRATION_STYLE =
  'Minimal flat line illustration in a clean doodle style. Uniform near-black outlines (#1f2328), medium even weight, rounded line ends, smooth and steady hand-drawn lines; simple closed shapes. Flat fills only: no shading, no gradients, no texture, no shadows. Palette limited to near-black, white and light gray (#e6e9ec, #d1d9e0) on an off-white background (#f6f8fa), plus one green accent in #1f883d / #2da44e / #4ac26b with a very light green (#aceebb) for soft highlights. Green is used sparingly: one key object and 3–5 short dash strokes radiating around it. Simple cartoon people: solid flat black hair, small dot eyes, short eyebrow lines, simple expressive mouths, clothes in flat light gray or white with black outline. Speech bubbles and props drawn with the same outline weight. Generous white space, uncluttered, centered composition. Avoid: photorealism, 3D, gradients, shading, textures, watercolor, extra colors, busy backgrounds, thick cartoon outlines, anime.';

// What to draw for one card: the picture idea the word maker wrote, or the word with its translation.
const subject = (i: PictureItem) => (i.pictureHint?.trim() || `${i.word} (${i.translation})`).replace(/\s+/g, ' ').slice(0, 160);

export function sheetPrompt(items: PictureItem[], grid: Grid): string {
  const empty = grid.cols * grid.rows - items.length;
  return [
    `A sheet of ${items.length} separate small pictures laid out as an exact grid of ${grid.cols} columns and ${grid.rows} rows on one plain off-white (#f6f8fa) background.`,
    'Every cell has the same size. Each picture is small and simple: it sits in the middle of its own cell and fills about two thirds of it, so there is a wide empty band between neighbours. No picture touches or crosses into another cell.',
    'No grid lines, no borders, no frames, no numbers, no letters, no words anywhere.',
    `Fill the cells left to right, top to bottom, in this order: ${items.map((item, n) => `${n + 1}. ${subject(item)}`).join(' ')}`,
    ...(empty > 0 ? [`The last ${empty} cell${empty > 1 ? 's' : ''} stay empty.`] : []),
    `Each picture shows the meaning of its item so a language learner remembers the word: one object, or one or two people doing one thing. Colours: only near-black, white, light gray and green. No red, orange, yellow, blue or brown. Style: ${ILLUSTRATION_STYLE}`,
  ].join(' ');
}

export const IMAGE_MODEL = 'gpt-image-2.5-sunburst';
const IMAGE_TIMEOUT_MS = 90_000;
type Fetch = typeof fetch;

// The real image model (OpenAI Images API). Used only when OPENAI_API_KEY is set; tests pass a fake fetch.
export function openaiSheetMaker(apiKey: string, fetchFn: Fetch = fetch, model = IMAGE_MODEL): SheetMaker {
  return {
    async sheet(items, grid) {
      const res = await fetchFn('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: sheetPrompt(items, grid), n: 1, size: `${SHEET.width}x${SHEET.height}`, quality: 'medium' }),
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`image model answered ${res.status}`);
      const body = (await res.json()) as { data?: { b64_json?: string }[] };
      const b64 = body.data?.[0]?.b64_json;
      if (!b64) throw new Error('image model sent no picture');
      return Buffer.from(b64, 'base64');
    },
  };
}

// Stands in for the image model in tests and in local runs with no OPENAI_API_KEY: one plain shape per cell.
// `delayMs` lets a local run show the wait. A function is read at each call (a test run changes it: `routes/dev-pictures.ts`).
const SHAPES = [
  (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#aceebb" stroke="#1f2328" stroke-width="6"/>`,
  (x: number, y: number, r: number) => `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="18" fill="#e6e9ec" stroke="#1f2328" stroke-width="6"/>`,
  (x: number, y: number, r: number) => `<path d="M${x} ${y - r} L${x + r} ${y + r} L${x - r} ${y + r} Z" fill="#4ac26b" stroke="#1f2328" stroke-width="6" stroke-linejoin="round"/>`,
];
export function fixtureSheetMaker(delayMs: number | (() => number) = 0): SheetMaker {
  return {
    async sheet(items, grid) {
      const wait = typeof delayMs === 'function' ? delayMs() : delayMs;
      if (wait) await new Promise((r) => setTimeout(r, wait));
      const w = SHEET.width / grid.cols, h = SHEET.height / grid.rows;
      const cells = items.map((_, i) => SHAPES[i % SHAPES.length]!((i % grid.cols) * w + w / 2, Math.floor(i / grid.cols) * h + h / 2, Math.min(w, h) / 4)).join('');
      return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET.width}" height="${SHEET.height}"><rect width="100%" height="100%" fill="#f6f8fa"/>${cells}</svg>`)).png().toBuffer();
    },
  };
}
