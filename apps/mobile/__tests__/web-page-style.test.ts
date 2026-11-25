import { Platform } from 'react-native';

import { installPageStyle, PAGE_CSS } from '@/platform/page-style';

// Page-wide browser rules (the web app only). Firefox starts its own drag of a picture when the mouse moves on it
// with the button down; that cancelled the swipe of a review card that has a picture (found 2026-11-25).
type Listener = (e: { preventDefault(): void }) => void;
const realOS = Platform.OS;
const setOS = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
const fakeDocument = () => {
  const listeners: Record<string, Listener[]> = {};
  const added: { id: string; textContent: string }[] = [];
  return {
    listeners,
    added,
    getElementById: (id: string) => added.find((s) => s.id === id) ?? null,
    createElement: () => ({ id: '', textContent: '' }),
    head: { appendChild: (s: { id: string; textContent: string }) => added.push(s) },
    addEventListener: (type: string, fn: Listener) => (listeners[type] = [...(listeners[type] ?? []), fn]),
  };
};
afterEach(() => {
  setOS(realOS);
  delete (globalThis as { document?: unknown }).document;
});

test('in a browser: the rules are added once, and the browser’s own drag of a picture is stopped', () => {
  setOS('web');
  const doc = fakeDocument();
  (globalThis as { document?: unknown }).document = doc;
  installPageStyle();
  installPageStyle();
  expect(doc.added).toHaveLength(1);
  expect(doc.added[0]!.textContent).toBe(PAGE_CSS);
  expect(PAGE_CSS).toContain('outline:none');
  expect(doc.listeners.dragstart).toHaveLength(1);
  const drag = { preventDefault: jest.fn() };
  doc.listeners.dragstart![0]!(drag);
  expect(drag.preventDefault).toHaveBeenCalled();
});

test('on the phone nothing is added', () => {
  setOS('ios');
  const doc = fakeDocument();
  (globalThis as { document?: unknown }).document = doc;
  installPageStyle();
  expect(doc.added).toHaveLength(0);
  expect(doc.listeners.dragstart).toBeUndefined();
});
