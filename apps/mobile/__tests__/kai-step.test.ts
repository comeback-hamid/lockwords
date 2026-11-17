import spec from '@/kai/character-spec.json';
import { createMemory, stepCharacter, type KaiFrame, type KaiInput, type KaiMemory } from '@/kai/step';

// Kai's step function is plain JavaScript, so Jest can run it frame by frame (60 frames a second).
const FRAME = 1000 / 60;

function run(m: KaiMemory, input: KaiInput, from: number, to: number, each?: (f: KaiFrame, t: number) => void) {
  let frame = stepCharacter(m, input, from);
  for (let t = from + FRAME; t <= to; t += FRAME) {
    frame = stepCharacter(m, input, t);
    each?.(frame, t);
  }
  return frame;
}

const input = (state: string, extra: Partial<KaiInput> = {}): KaiInput => ({ state, playKey: 0, progress: -1, still: false, ...extra });
const part = (f: KaiFrame, name: string) => f.parts.filter((p) => p.name === name);
const body = spec.palette.light.body;
const hex = (c: readonly number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

describe('Kai step', () => {
  test('greeting waves, then goes to idle after 2 seconds', () => {
    const m = createMemory();
    run(m, input('greeting'), 0, 1900);
    expect(m.state).toBe('greeting');
    run(m, input('greeting'), 1900, 2100);
    expect(m.state).toBe('idle');
  });

  test('celebrate goes to idle after 2.4 seconds', () => {
    const m = createMemory();
    run(m, input('celebrate'), 0, 2300);
    expect(m.state).toBe('celebrate');
    run(m, input('celebrate'), 2300, 2500);
    expect(m.state).toBe('idle');
  });

  test('"previous" goes back to the state before', () => {
    const m = createMemory();
    run(m, input('waiting'), 0, 500);
    run(m, input('poke'), 500, 1200);
    expect(m.state).toBe('waiting');
  });

  test('a new state during the hold wins', () => {
    const m = createMemory();
    run(m, input('greeting'), 0, 1000);
    run(m, input('listening'), 1000, 3000);
    expect(m.state).toBe('listening');
  });

  test('a new play key plays the same state again', () => {
    const m = createMemory();
    run(m, input('greeting'), 0, 2500);
    expect(m.state).toBe('idle');
    run(m, input('greeting', { playKey: 1 }), 2500, 2600);
    expect(m.state).toBe('greeting');
  });

  test('an unknown state shows idle', () => {
    const m = createMemory();
    run(m, input('dancing-on-the-moon'), 0, 200);
    expect(m.state).toBe('idle');
  });

  test('making at 0.5 lights about half the slabs', () => {
    const m = createMemory();
    const f = run(m, input('making', { progress: 0.5 }), 0, 1000);
    const slabs = part(f, 'slab');
    expect(slabs).toHaveLength(7);
    const lit = slabs.filter((s) => hex(s.color) === body).length;
    expect(lit).toBeGreaterThanOrEqual(3);
    expect(lit).toBeLessThanOrEqual(4);
    expect(hex(slabs[6].color)).not.toBe(body);
  });

  test('Kai blinks on its own', () => {
    const m = createMemory();
    const full = spec.geometry.chat.eyes.height;
    let closed = false;
    run(m, input('idle'), 0, 7000, (f) => {
      if (part(f, 'eye')[0].h < full * 0.5) closed = true;
    });
    expect(closed).toBe(true);
  });

  test('greeting moves the right arm (the wave)', () => {
    const m = createMemory();
    const ys = new Set<number>();
    run(m, input('greeting'), 0, 1500, (f, t) => {
      if (t > 500) ys.add(Math.round(part(f, 'arm')[1].y * 100));
    });
    expect(ys.size).toBeGreaterThan(5);
  });

  test('Reduce Motion: still greeting pose, no wave, no effects, then idle as usual', () => {
    const m = createMemory();
    const ys = new Set<number>();
    let effects = 0;
    run(m, input('greeting', { still: true }), 0, 1900, (f, t) => {
      if (t > 1000) ys.add(Math.round(part(f, 'arm')[1].y * 100));
      effects += f.fx.length + f.text.length;
    });
    expect(ys.size).toBe(1);
    expect(effects).toBe(0);
    run(m, input('greeting', { still: true }), 1900, 2100);
    expect(m.state).toBe('idle');
  });

  test('effects show for their states', () => {
    const fxFor = (state: string) => {
      const f = run(createMemory(), input(state), 0, 1200);
      return f.fx.filter((r) => r.a > 0.05).length + f.text.filter((r) => r.a > 0.05).length;
    };
    expect(fxFor('idle')).toBe(0);
    for (const state of ['listening', 'thinking', 'speaking', 'celebrate', 'making', 'oops']) expect(fxFor(state)).toBeGreaterThan(0);
  });
});
