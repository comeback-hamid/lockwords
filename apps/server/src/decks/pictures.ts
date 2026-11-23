import type { PicturesStore } from '../app.js';
import { gridFor, sheetSizes, type PictureItem, type SheetMaker } from '../llm/deck-pictures.js';
import { cutSheet } from './cut-sheet.js';
import { FAST_FAILURE_MS } from './jobs.js';

// The pictures of a deck, made right after its words. The deck is already ready and in Review: this only adds pictures.
// A failed run loses nothing: the deck keeps its words, its cards have no picture, and the status says "failed".
export type PictureTodo = PictureItem & { cardId: string };
export type PictureDeps = { pictures: PicturesStore; sheetMaker: SheetMaker; now?: () => number };

// One sheet: draw, cut, save. One more try only when the first one failed fast (like the words, vocab-engine 2.4).
async function drawSheet({ pictures, sheetMaker, now = Date.now }: PictureDeps, deckId: string, items: PictureTodo[]): Promise<boolean> {
  const grid = gridFor(items.length);
  const once = async () => {
    const cut = await cutSheet(await sheetMaker.sheet(items, grid), grid, items.length);
    await pictures.save(deckId, items.map((item, i) => ({ cardId: item.cardId, data: cut[i]! })));
  };
  const started = now();
  try {
    await once();
    return true;
  } catch {
    if (now() - started >= FAST_FAILURE_MS) return false;
    return once().then(() => true, () => false);
  }
}

// Never throws. Draws the cards that have no picture yet, so a job that runs twice draws nothing twice.
export async function drawDeckPictures(deps: PictureDeps, deckId: string): Promise<void> {
  try {
    const todo = await deps.pictures.todo(deckId);
    let at = 0;
    const sheets = todo.length ? sheetSizes(todo.length).map((size) => todo.slice(at, (at += size))) : [];
    const done = await Promise.all(sheets.map((items) => drawSheet(deps, deckId, items))); // more than one sheet: at the same time
    await deps.pictures.finish(deckId, done.every(Boolean) ? 'ready' : 'failed');
  } catch {
    await deps.pictures.finish(deckId, 'failed').catch(() => {});
  }
}
