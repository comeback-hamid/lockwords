import type { WordPack } from './estimate.js';

// Where the word test keeps AI packs (by typed language) and every finished test (for tuning, engine section 1.12).
export type WordTestResultRow = {
  userId: string;
  language: string;
  version: number;
  words: number;
  raw: number;
  lo: number;
  hi: number;
  r50: number;
  g: number;
  realKnown: number;
  fakes: number;
  fn: number;
  pages: string;
  reliable: boolean;
  ticks: string;
};
export type WordTestStore = {
  getPack(language: string): Promise<WordPack | null>;
  savePack(language: string, pack: WordPack): Promise<void>; // first one wins
  saveResult(row: WordTestResultRow): Promise<void>;
};
