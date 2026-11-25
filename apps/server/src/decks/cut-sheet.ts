import sharp from 'sharp';

import type { Grid } from '../llm/deck-pictures.js';

// Cuts a sheet of pictures into one WebP picture per item, left to right, top to bottom.
// The image model draws the grid by eye, so rows and columns are not exactly even (real sheets of 2026-11-23: a
// picture of the next row showed at the bottom of a cell). So each cut line is moved, near its even place, to where the
// sheet is emptiest: the gap between two rows or columns of pictures. A sheet with no gaps is cut evenly.
const INK = 24; // a pixel this far from the background's grey is part of a picture
const REACH = 0.18; // a cut line may move this share of a cell, each way

const EMPTY = 0.004; // a line with less picture on it than this share of its length counts as empty

// Where to cut along one side: `parts` + 1 places from 0 to `size`. ink[i] = how many picture pixels are on line i,
// `across` = how long a line is. A cut line that goes through a picture moves to the middle of the nearest empty band
// that starts in reach. No empty band in reach: the even place stays.
export function cutLines(ink: ArrayLike<number>, size: number, parts: number, across = size): number[] {
  const lines = [0];
  const reach = Math.floor((size / parts) * REACH);
  const empty = (i: number) => i > 0 && i < size && (ink[i] ?? 0) <= across * EMPTY;
  for (let k = 1; k < parts; k++) {
    const even = Math.round((k * size) / parts);
    let cut = even;
    if (!empty(even))
      for (let d = 1; d <= reach; d++) {
        const way = empty(even - d) ? -1 : empty(even + d) ? 1 : 0;
        if (!way) continue;
        let end = even + way * d;
        while (empty(end + way) && Math.abs(end + way - even) < size / parts / 2) end += way; // the whole band, at most half a cell away
        cut = Math.round((even + way * d + end) / 2);
        break;
      }
    lines.push(cut);
  }
  return [...lines, size];
}

export async function cutSheet(sheet: Buffer, grid: Grid, count: number): Promise<Buffer[]> {
  const { data, info } = await sharp(sheet).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  if (!width || !height) throw new Error('the sheet is not a picture');
  // The background is the grey the sheet has most of.
  const seen = new Uint32Array(256);
  for (let i = 0; i < data.length; i += info.channels) seen[data[i]!]!++;
  const background = seen.indexOf(Math.max(...seen));
  const columns = new Uint32Array(width), rows = new Uint32Array(height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (Math.abs(data[(y * width + x) * info.channels]! - background) > INK) {
        columns[x]!++;
        rows[y]!++;
      }
  const xs = cutLines(columns, width, grid.cols, height), ys = cutLines(rows, height, grid.rows, width);
  return Promise.all(
    Array.from({ length: Math.min(count, grid.cols * grid.rows) }, (_, i) => {
      const c = i % grid.cols, r = Math.floor(i / grid.cols);
      return sharp(sheet).extract({ left: xs[c]!, top: ys[r]!, width: xs[c + 1]! - xs[c]!, height: ys[r + 1]! - ys[r]! }).webp({ quality: 88 }).toBuffer();
    }),
  );
}

// A single word's picture: the square image cut to the shape of a deck picture (5 : 4, from the middle) and made small.
export const WORD_PICTURE = { width: 512, height: 410 } as const;
export async function cutSingle(image: Buffer): Promise<Buffer> {
  return sharp(image).resize(WORD_PICTURE.width, WORD_PICTURE.height, { fit: 'cover', position: 'centre' }).webp({ quality: 88 }).toBuffer();
}
