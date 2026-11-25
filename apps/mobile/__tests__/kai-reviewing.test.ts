import spec from '@/kai/character-spec.json';
import { createMemory, stepCharacter, stillEffects, type KaiFrame, type KaiInput } from '@/kai/step';
import { KaiCanvas as WebCanvas } from '../src/kai/kai-canvas.web';

// `reviewing` is Kai on the Review tab's start screen: it goes through flashcards, one to the right, the next to the left.
const FRAME = 1000 / 60;
const state = spec.chat.states.reviewing;
const CYCLE = state.keys.durationMs + state.keys.restMs;
const input = (extra: Partial<KaiInput> = {}): KaiInput => ({ state: 'reviewing', playKey: 0, progress: -1, still: false, ...extra });

// The top card is the white one (palette.surface). Its place and how solid it is tell where the swipe is.
const surface = [1, 3, 5].map((i) => parseInt(spec.palette.light.surface.slice(i, i + 2), 16));
const topCard = (f: KaiFrame) => f.fx.find((r) => r.color.join() === surface.join())!;

/** Runs Kai frame by frame and gives the frame at each asked time (ms). */
function framesAt(times: number[], extra: Partial<KaiInput> = {}) {
  const m = createMemory();
  const out: KaiFrame[] = [];
  let t = 0;
  for (const until of times) {
    let f = stepCharacter(m, input(extra), t);
    for (; t <= until; t += FRAME) f = stepCharacter(m, input(extra), t);
    out.push(f);
  }
  return { m, out };
}

describe('Kai reviewing', () => {
  test('the state is in the spec, in the gallery order, with the synced cards effect', () => {
    expect(state.fx).toBe('cards');
    expect(spec.chat.order).toContain('reviewing');
    expect(spec.syncedEffects).toContain('cards');
    expect(spec.effects.cards).toBeTruthy();
  });

  test('it loops: no hold time, and after many cycles Kai is still reviewing', () => {
    expect(state).not.toHaveProperty('holdMs');
    expect(state).not.toHaveProperty('returnsTo');
    const { m } = framesAt([CYCLE * 4 + 300]);
    expect(m.state).toBe('reviewing');
  });

  test('the first card rests in the hand, then flies off to the right and fades', () => {
    const { out } = framesAt([0.2 * CYCLE, 0.39 * CYCLE, 0.42 * CYCLE, 0.455 * CYCLE]);
    const [rest, start, mid, gone] = out.map(topCard);
    expect(rest.a).toBeCloseTo(1, 1);
    expect(start.x).toBeGreaterThan(rest.x + 1);
    expect(mid.x).toBeGreaterThan(start.x);
    expect(mid.a).toBeLessThan(1);
    expect(gone.a).toBeLessThan(0.05);
  });

  test('the next card comes back to the hand, then flies off to the left', () => {
    const { out } = framesAt([0.2 * CYCLE, 0.7 * CYCLE, 0.88 * CYCLE, 0.91 * CYCLE, 0.935 * CYCLE]);
    const [rest, second, start, mid, gone] = out.map(topCard);
    expect(second.x).toBeCloseTo(rest.x, 5);
    expect(second.a).toBeCloseTo(1, 1);
    expect(start.x).toBeLessThan(rest.x - 1);
    expect(mid.x).toBeLessThan(start.x);
    expect(gone.a).toBeLessThan(0.05);
  });

  test('the second cycle is the same as the first', () => {
    const { out } = framesAt([0.42 * CYCLE, 1.42 * CYCLE]);
    expect(topCard(out[1]).x).toBeCloseTo(topCard(out[0]).x, 1);
  });

  test('Kai looks at the card, then follows the one that goes left', () => {
    const { out } = framesAt([0.2 * CYCLE, 0.93 * CYCLE]);
    const eyeX = (f: KaiFrame) => f.parts.find((p) => p.name === 'eye')!.x;
    expect(eyeX(out[0])).toBeGreaterThan(spec.geometry.chat.eyes.x[0]);
    expect(eyeX(out[1])).toBeLessThan(spec.geometry.chat.eyes.x[0]);
  });

  test('Reduce Motion: a still pose that keeps the card in the hand', () => {
    const { out } = framesAt([0.3 * CYCLE, 0.42 * CYCLE, 0.9 * CYCLE], { still: true });
    const cards = out.map(topCard);
    expect(cards[0].a).toBeCloseTo(1, 5);
    expect(cards[1].x).toBe(cards[0].x);
    expect(cards[2].x).toBe(cards[0].x);
    expect(out[2].pose.lean).toBeCloseTo(out[1].pose.lean, 5);
    expect(out[2].pose.ty).toBeCloseTo(out[1].pose.ty, 5);
  });

  test('the browser still shows the cards over the picture and does not crash', () => {
    expect(stillEffects('reviewing').length).toBeGreaterThan(0);
    expect(stillEffects('idle')).toEqual([]);
    const view = WebCanvas({ state: 'reviewing', playKey: 0, still: true, width: 174 });
    expect(view.props.style.width).toBe(174);
    expect(view.props.children[1]).toHaveLength(stillEffects('reviewing').length);
  });
});
