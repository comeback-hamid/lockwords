import type { TestPage } from '@/api/client';

// The word test pages (docs/vocab-engine.md). A and B always show; the server says when C and D come.
export const PAGES: TestPage[] = ['A', 'B', 'C', 'D'];
export const PAGE_TITLE: Record<TestPage, string> = { A: 'BASIC WORDS', B: 'INTERMEDIATE WORDS', C: 'ADVANCED WORDS', D: 'EXPERT WORDS' };
export const isPage = (p: string | undefined): p is TestPage => PAGES.includes(p as TestPage);
