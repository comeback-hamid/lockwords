import { drawKaiFrame, type Ctx2D } from '@/kai/draw-2d';
import { createMemory, stepCharacter, type KaiFrame } from '@/kai/step';

// Kai in a browser is drawn on the browser's own 2D canvas (web-live-kai). The drawer gets one frame from the same
// step function as the phone and puts it on the canvas in the phone's order: shadow, effects, text, then the body
// with its lean, scale and spin, with the two leaves moved on their own.
function recorder() {
  const calls: string[] = [];
  const ctx = { fillStyle: '', font: '' } as Ctx2D & { calls: string[] };
  const note = (name: string) => (...args: unknown[]) => void calls.push(`${name}(${args.map((a) => (typeof a === 'number' ? Math.round(a * 100) / 100 : a)).join(',')})`);
  for (const name of ['save', 'restore', 'translate', 'scale', 'rotate', 'beginPath', 'ellipse', 'roundRect', 'fill', 'fillText'] as const) (ctx as unknown as Record<string, unknown>)[name] = note(name);
  ctx.fillRect = (x, y, w, h) => void calls.push(`fillRect(${[x, y, w, h].map((n) => Math.round(n * 100) / 100).join(',')})@${ctx.fillStyle}`);
  ctx.calls = calls;
  return ctx;
}
const frame = (over: Partial<KaiFrame> = {}): KaiFrame => ({
  shadow: { cx: 14, cy: 20, rx: 6, ry: 1, color: [10, 20, 30], a: 0.5 },
  pose: { tx: 1, ty: 2, lean: 10, sx: 1, sy: 1, spin: 0 },
  leafL: { dy: 0, s: 1, rot: 5 },
  leafR: { dy: 0, s: 1, rot: -5 },
  parts: [
    { name: 'stem', group: 'stem', x: 13, y: 4, w: 2, h: 3, color: [0, 100, 0], a: 1 },
    { name: 'leafL', group: 'leafL', x: 10, y: 2, w: 3, h: 2, color: [0, 200, 0], a: 1 },
    { name: 'body', group: 'body', x: 8, y: 8, w: 12, h: 9, color: [50, 150, 50], a: 1 },
    { name: 'gone', group: 'body', x: 0, y: 0, w: 5, h: 5, color: [1, 2, 3], a: 0 },
  ],
  fx: [{ x: 1, y: 1, w: 2, h: 2, color: [255, 0, 0], a: 0.5, r: 0.5 }, { x: 3, y: 3, w: 1, h: 1, color: [9, 9, 9], a: 0, r: 0 }],
  text: [{ text: '?', x: 20, y: 5, color: [0, 0, 255], a: 1 }],
  ...over,
});

test('the order is shadow, effects, text, then stem, left leaf, right leaf, body', () => {
  const ctx = recorder();
  drawKaiFrame(ctx, frame(), 6, 3, 4);
  const at = (needle: string) => ctx.calls.findIndex((c) => c.startsWith(needle));
  expect(at('ellipse(14,20,6,1')).toBeGreaterThan(-1);
  expect(at('ellipse')).toBeLessThan(at('roundRect(1,1,2,2,0.5)'));
  expect(at('roundRect')).toBeLessThan(at('fillText(?,20,5)'));
  expect(at('fillText')).toBeLessThan(at('fillRect(13,4,2,3)'));
  expect(at('fillRect(13,4,2,3)')).toBeLessThan(at('fillRect(10,2,3,2)'));
  expect(at('fillRect(10,2,3,2)')).toBeLessThan(at('fillRect(8,8,12,9)'));
});

test('the picture is moved to its place and scaled to whole pixels per unit first', () => {
  const ctx = recorder();
  drawKaiFrame(ctx, frame(), 6, 3, 4);
  expect(ctx.calls.slice(0, 3)).toEqual(['save()', 'translate(3,4)', 'scale(6,6)']);
  expect(ctx.calls.at(-1)).toBe('restore()');
  expect(ctx.calls.filter((c) => c === 'save()').length).toBe(ctx.calls.filter((c) => c === 'restore()').length);
});

test('colors carry their strength; a part or effect with no strength is not drawn', () => {
  const ctx = recorder();
  drawKaiFrame(ctx, frame(), 6, 0, 0);
  expect(ctx.calls).toContain('fillRect(8,8,12,9)@rgba(50,150,50,1)');
  expect(ctx.calls.some((c) => c.includes('fillRect(0,0,5,5)'))).toBe(false);
  expect(ctx.calls.some((c) => c.startsWith('roundRect(3,3'))).toBe(false);
});

test('the body leans in degrees turned to the canvas’s radians; a leaf turns on its own', () => {
  const ctx = recorder();
  drawKaiFrame(ctx, frame(), 6, 0, 0);
  expect(ctx.calls).toContain(`rotate(${Math.round(((10 * Math.PI) / 180) * 100) / 100})`);
  expect(ctx.calls).toContain(`rotate(${Math.round(((5 * Math.PI) / 180) * 100) / 100})`);
});

test('a real frame from the step function draws without a gap: every state of the chat', () => {
  for (const state of ['idle', 'greeting', 'thinking', 'speaking', 'listening', 'making', 'celebrate', 'oops', 'reviewing', 'sleeping']) {
    const m = createMemory();
    const ctx = recorder();
    let f = stepCharacter(m, { state, playKey: 0, progress: -1, still: false }, 0);
    f = stepCharacter(m, { state, playKey: 0, progress: -1, still: false }, 400);
    drawKaiFrame(ctx, f, 5, 0, 0);
    expect(ctx.calls.filter((c) => c.startsWith('fillRect')).length).toBeGreaterThan(5);
    expect(ctx.calls.join(' ')).not.toContain('NaN');
  }
});
