// The browser version of Kai's canvas (Metro picks kai-canvas.web.tsx on the web). Jest loads it by its full name.
import { KaiCanvas } from '../src/kai/kai-canvas.web';

// The canvas has no state of its own, so the test reads the picture it hands to the screen.
const draw = (state: string) => KaiCanvas({ state, playKey: 0, still: true, width: 174 }).props;

test('a state with its own still shows that picture, in Kai’s proportions', () => {
  const thinking = draw('thinking');
  const idle = draw('idle');
  expect(thinking.source).toBeTruthy();
  expect(thinking.source).not.toBe(idle.source);
  expect(thinking.style.width).toBe(174);
  expect(thinking.style.height).toBeGreaterThan(0);
});

test('a state with no still shows the nearest one; an unknown state shows idle', () => {
  expect(draw('making').source).toBe(draw('thinking').source);
  expect(draw('allDone').source).toBe(draw('celebrate').source);
  expect(draw('not-a-state').source).toBe(draw('idle').source);
});
