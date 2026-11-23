import sharp from 'sharp';

import type { Grid } from '../llm/deck-pictures.js';

// Cuts a sheet of pictures into one WebP picture per item: equal cells, left to right, top to bottom.
// The sheet's own size decides the cell size, so a sheet in another size than we asked for still works.
export async function cutSheet(sheet: Buffer, grid: Grid, count: number): Promise<Buffer[]> {
  const { width, height } = await sharp(sheet).metadata();
  if (!width || !height) throw new Error('the sheet is not a picture');
  const w = Math.floor(width / grid.cols), h = Math.floor(height / grid.rows);
  return Promise.all(
    Array.from({ length: Math.min(count, grid.cols * grid.rows) }, (_, i) =>
      sharp(sheet).extract({ left: (i % grid.cols) * w, top: Math.floor(i / grid.cols) * h, width: w, height: h }).webp({ quality: 88 }).toBuffer(),
    ),
  );
}
