import { startFrameLoop } from '@/platform/frame-loop';

// One animation loop for a canvas in the browser (web-live-kai): it draws on every frame while its canvas is on
// screen, draws nothing while it is hidden (a hidden tab, a screen under another screen), and stops for good when asked.
function fakeFrames() {
  let next: ((t: number) => void) | null = null;
  let id = 0;
  const cancelled: number[] = [];
  return {
    raf: (fn: (t: number) => void) => {
      next = fn;
      return ++id;
    },
    caf: (n: number) => void cancelled.push(n),
    tick: (t: number) => {
      const fn = next;
      next = null;
      fn?.(t);
    },
    waiting: () => next !== null,
    cancelled,
  };
}

test('it draws on every frame with the time since it started', () => {
  const f = fakeFrames();
  const seen: number[] = [];
  startFrameLoop({ draw: (ms) => seen.push(ms), isShown: () => true, raf: f.raf, caf: f.caf });
  f.tick(1000);
  f.tick(1016);
  f.tick(1040);
  expect(seen).toEqual([0, 16, 40]);
});

test('hidden: nothing is drawn, and the clock does not run on, so Kai continues where it was', () => {
  const f = fakeFrames();
  const seen: number[] = [];
  let shown = true;
  startFrameLoop({ draw: (ms) => seen.push(ms), isShown: () => shown, raf: f.raf, caf: f.caf });
  f.tick(1000);
  f.tick(1100);
  shown = false;
  f.tick(1200);
  f.tick(5000);
  expect(seen).toEqual([0, 100]);
  shown = true;
  f.tick(5000); // back on screen: the same moment as before, no jump
  f.tick(5016);
  expect(seen).toEqual([0, 100, 100, 116]);
});

test('stop ends the loop: the waiting frame is cancelled and a late frame draws nothing', () => {
  const f = fakeFrames();
  const seen: number[] = [];
  const stop = startFrameLoop({ draw: (ms) => seen.push(ms), isShown: () => true, raf: f.raf, caf: f.caf });
  f.tick(10);
  stop();
  expect(f.cancelled).toHaveLength(1);
  f.tick(20);
  expect(seen).toEqual([0]);
  expect(f.waiting()).toBe(false);
});
