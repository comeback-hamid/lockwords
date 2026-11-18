/* Kai's step function: a port of step() in docs/design/CHARACTER.html (chat form only, light theme).
   It reads only character-spec.json. One call = one frame. It returns plain rectangles in spec units;
   kai-canvas.tsx draws them with Skia. Every function is a worklet so it can run on the UI thread.
   The page's names are kept so the two can be compared line by line. */
import SPEC from './character-spec.json';

type RGB = [number, number, number];
type Pose = Record<keyof typeof SPEC.poseDefaults, number>;
type StateSpec = {
  pose?: Partial<Pose>;
  motion?: { type: string; amp: number; period: number };
  keys?: { durationMs: number; restMs?: number; snapStart?: boolean; frames: { at: number; ease?: string; pose?: Partial<Pose> }[] };
  bind?: { ears?: number; mouth?: number; lift?: number; arms?: number; look?: number; fill?: number };
  armWave?: { amp: number; period: number };
  ring?: { amp: number; period: number };
  fx?: string;
  noBlink?: boolean;
  holdMs?: number;
  returnsTo?: string;
};

export type KaiInput = {
  /** The state a screen asks for. Unknown names show idle. */
  state: string;
  /** Change it to play the same state again (a tap on Kai). */
  playKey: number;
  /** 0 to 1 for `making`; -1 = none (fake progress). */
  progress: number;
  /** Reduce Motion: still poses, no loops, no effects. */
  still: boolean;
};
export type KaiPart = { name: string; group: 'body' | 'stem' | 'leafL' | 'leafR'; x: number; y: number; w: number; h: number; color: RGB; a: number };
export type KaiRect = { x: number; y: number; w: number; h: number; color: RGB; a: number; r: number };
export type KaiText = { text: string; x: number; y: number; color: RGB; a: number };
export type KaiFrame = {
  shadow: { cx: number; cy: number; rx: number; ry: number; color: RGB; a: number };
  /** The body transform, as on the page: translate, lean around the pivot, scale around the pivot, spin. */
  pose: { tx: number; ty: number; lean: number; sx: number; sy: number; spin: number };
  leafL: { dy: number; s: number; rot: number };
  leafR: { dy: number; s: number; rot: number };
  parts: KaiPart[];
  fx: KaiRect[];
  text: KaiText[];
};
export type KaiMemory = {
  state: string;
  prev: string;
  asked: string;
  key: number;
  t0: number;
  cycle: number;
  last: number;
  P: Pose;
  lvl: number;
  voiceTarget: number;
  voiceNext: number;
  nextBlink: number;
  blinkEnd: number;
  fxA: Record<string, number>;
};

const STATES = SPEC.chat.states as unknown as Record<string, StateSpec>;
const G = SPEC.geometry;
const R = SPEC.rules;
const N = G.slabCount;
const TAU = Math.PI * 2;
const FX_FADE_MS = 300; // the page's `.fx{transition:opacity .3s}`

function hex2rgb(h: string): RGB {
  'worklet';
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
const PAL = SPEC.palette.light;
const C = {
  body: hex2rgb(PAL.body), hi: hex2rgb(PAL.hi), shade: hex2rgb(PAL.shade), leaf: hex2rgb(PAL.leaf), leafHi: hex2rgb(PAL.leafHi),
  eye: hex2rgb(PAL.eye), accent: hex2rgb(PAL.accent), dimTo: hex2rgb(PAL.dimTo), shadow: hex2rgb(PAL.shadow),
  squares: PAL.squares.map(hex2rgb),
};

function mix(a: RGB, b: RGB, t: number): RGB {
  'worklet';
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function clamp(x: number) {
  'worklet';
  return Math.max(0, Math.min(1, x));
}
function lerp(a: number, b: number, t: number) {
  'worklet';
  return a + (b - a) * t;
}
function ease(x: number) {
  'worklet';
  return x * x * (3 - 2 * x); // smoothstep
}
function easeBy(name: string, x: number) {
  'worklet';
  if (name === 'linear') return x;
  if (name === 'out') return 1 - Math.pow(1 - x, 3);
  if (name === 'in') return x * x * x;
  return ease(x);
}

/* CSS timing functions (for the effects' @keyframes): cubic-bezier(x1, y1, x2, y2). */
function bezier(x1: number, y1: number, x2: number, y2: number, x: number) {
  'worklet';
  let t = x;
  for (let i = 0; i < 8; i++) {
    const cx = 3 * t * (1 - t) * (1 - t) * x1 + 3 * t * t * (1 - t) * x2 + t * t * t - x;
    const dx = 3 * (1 - t) * (1 - t) * x1 + 6 * t * (1 - t) * (x2 - x1) + 3 * t * t * (1 - x2);
    if (Math.abs(cx) < 1e-5 || dx === 0) break;
    t = Math.max(0, Math.min(1, t - cx / dx));
  }
  return 3 * t * (1 - t) * (1 - t) * y1 + 3 * t * t * (1 - t) * y2 + t * t * t;
}
function timing(name: string, x: number) {
  'worklet';
  if (name === 'ease') return bezier(0.25, 0.1, 0.25, 1, x);
  if (name === 'ease-out') return bezier(0, 0, 0.58, 1, x);
  if (name === 'ease-in-out') return bezier(0.42, 0, 0.58, 1, x);
  return x;
}
/** One property of a CSS @keyframes rule: stops [at, value], at from 0 to 1. */
function kf(stops: number[][], p: number, fn: string) {
  'worklet';
  let i = 0;
  while (i < stops.length - 2 && p >= stops[i + 1][0]) i++;
  const A = stops[i], Z = stops[i + 1];
  const w = Z[0] === A[0] ? 1 : clamp((p - A[0]) / (Z[0] - A[0]));
  return A[1] + (Z[1] - A[1]) * timing(fn, w);
}
/** Where an infinite CSS animation is at time t (ms): 0 to 1. Delays are phase offsets. */
function phase(t: number, durS: number, delayS: number) {
  'worklet';
  const p = ((t / 1000 - delayS) / durS) % 1;
  return p < 0 ? p + 1 : p;
}

function knownState(name: string) {
  'worklet';
  return STATES[name] ? name : 'idle';
}

export function createMemory(): KaiMemory {
  'worklet';
  return {
    state: 'idle', prev: 'idle', asked: '', key: -1, t0: 0, cycle: -1, last: -1,
    P: { ...SPEC.poseDefaults }, lvl: 0, voiceTarget: 0, voiceNext: 0,
    nextBlink: 1500 + Math.random() * 3000, blinkEnd: 0, fxA: {},
  };
}

function enter(m: KaiMemory, name: string, t: number) {
  'worklet';
  if (name !== m.state) m.prev = m.state;
  m.state = name;
  m.t0 = t;
  m.cycle = -1;
}

function sampleKeys(K: NonNullable<StateSpec['keys']>, u: number, base: Pose): Pose {
  'worklet';
  const F = K.frames;
  let i = 0;
  while (i < F.length - 2 && u >= F[i + 1].at) i++;
  const A = F[i], Z = F[i + 1];
  const w = easeBy(Z.ease || 'smooth', clamp((u - A.at) / (Z.at - A.at)));
  const pose = { ...base };
  for (const key in base) {
    const k = key as keyof Pose;
    const a = A.pose?.[k] ?? base[k], z = Z.pose?.[k] ?? base[k];
    pose[k] = a + (z - a) * w;
  }
  return pose;
}

/* The effects this port draws. Positions come from the page's markup(), timing from its @keyframes. */
function effect(name: string, t: number, lvl: number, alpha: number, fx: KaiRect[], text: KaiText[]) {
  'worklet';
  if (alpha <= 0) return;
  const px = (cls: string, x: number, dx: number, durS: number, peak: number, move: number, group: number) => {
    const ys = [2, 4.6, 7.2];
    for (let i = 0; i < 3; i++) {
      const p = phase(t, durS, -i * 0.43);
      const op = kf([[0, 0], [peak, 1], [1, 0]], p, 'linear');
      fx.push({ x: x + (i % 2) * dx + move * p, y: ys[i], w: 0.8, h: 0.8, color: C.accent, a: op * group * alpha, r: 0 });
    }
    return cls;
  };
  if (name === 'in') {
    const g = Math.min(1, 0.2 + lvl * 1.2);
    px('inl', -4.6, 0.5, 1.3, 0.3, 3.5, g);
    px('inr', 21.8, -0.5, 1.3, 0.3, -3.5, g);
  } else if (name === 'out') {
    const g = Math.min(1, 0.1 + lvl * 1.3);
    px('outl', -1.2, 0.4, 1, 0.25, -3.5, g);
    px('outr', 18.4, -0.4, 1, 0.25, 3.5, g);
  } else if (name === 'dots') {
    const dots = [[17, 0, 1, 0], [18.6, -2, 1.4, 0.25], [20.4, -4.6, 2, 0.5]];
    for (const [x, y, s, d] of dots) {
      const op = kf([[0, 0], [0.15, 0], [0.3, 1], [0.85, 1], [1, 0]], phase(t, 1.8, d), 'ease');
      fx.push({ x, y, w: s, h: s, color: C.accent, a: op * alpha, r: 0 });
    }
  } else if (name === 'squares') {
    for (let i = 0; i < 10; i++) {
      const p = phase(t, 1.8, -((i * 0.37) % 1.8));
      const op = kf([[0, 0], [0.2, 1], [1, 0]], p, 'ease-out');
      const ty = kf([[0, 0], [0.2, -2.5], [1, -13]], p, 'ease-out');
      const sc = kf([[0, 0.4], [0.2, 1], [1, 1]], p, 'ease-out');
      const x = -3.5 + ((i * 7.3) % 24), y = 8 + (i % 3), s = 1.2 * sc;
      fx.push({ x: x + (1.2 - s) / 2, y: y + ty + (1.2 - s) / 2, w: s, h: s, color: C.squares[i % 5], a: op * alpha, r: 0.2 * sc });
    }
  } else if (name === 'stack') {
    for (let i = 0; i < 4; i++) {
      const p = phase(t, 2.6, i * 0.4);
      const op = kf([[0, 0], [0.12, 1], [0.78, 1], [0.88, 0], [1, 0]], p, 'linear');
      const ty = kf([[0, -4], [0.12, 0], [1, 0]], p, 'linear');
      fx.push({ x: 19.6, y: 8.9 - i * 1.7 + ty, w: 1.5, h: 1.5, color: C.squares[i + 1], a: op * alpha, r: 0.25 });
    }
  } else if (name === 'bang' || name === 'q') {
    const ty = kf([[0, 0], [0.5, -0.6], [1, 0]], phase(t, 1.2, 0), 'ease-in-out');
    text.push({ text: name === 'bang' ? '!' : '?', x: 18, y: 0.5 + ty, color: C.accent, a: alpha });
  } else if (name === 'sparkle') {
    const spots = [[-2.5, 0], [20.5, 1], [-1.5, 7.5], [20, 7]];
    for (let i = 0; i < 4; i++) {
      const p = phase(t, 1, -i * 0.25);
      const op = kf([[0, 0], [0.5, 1], [1, 0]], p, 'ease-in-out');
      const sc = kf([[0, 0.3], [0.5, 1], [1, 0.3]], p, 'ease-in-out');
      fx.push({ x: spots[i][0] + (1 - sc) / 2, y: spots[i][1] + (1 - sc) / 2, w: sc, h: sc, color: C.accent, a: op * alpha, r: 0 });
    }
  }
}
const FX = ['in', 'out', 'dots', 'squares', 'stack', 'bang', 'q', 'sparkle'];

export function stepCharacter(m: KaiMemory, input: KaiInput, t: number): KaiFrame {
  'worklet';
  const dt = m.last < 0 ? 16 : Math.min(50, Math.max(0, t - m.last));
  m.last = t;

  /* which state: a new ask (or a new play key) wins; a one-shot state returns after holdMs */
  if (input.state !== m.asked || input.playKey !== m.key) {
    m.asked = input.state;
    m.key = input.playKey;
    enter(m, knownState(input.state), t);
  }
  let S = STATES[m.state];
  if (S.holdMs && t - m.t0 >= S.holdMs) {
    enter(m, knownState(S.returnsTo === 'previous' ? m.prev : S.returnsTo || 'idle'), t);
    S = STATES[m.state];
  }
  const ch = G.chat, still = input.still;

  /* 0. local time */
  const lt = t - m.t0, K = still ? undefined : S.keys, M = still ? undefined : S.motion;
  const cyc = K ? K.durationMs + (K.restMs ?? 900) : M ? M.period : 0;
  if (cyc) {
    const n = Math.floor(lt / cyc);
    if (n !== m.cycle) {
      m.cycle = n;
      if (K && K.snapStart) Object.assign(m.P, SPEC.poseDefaults, S.pose || {}, K.frames[0].pose || {});
    }
  }
  const prog = input.progress >= 0 ? clamp(input.progress) : clamp(((lt % R.fakeProgress.periodMs) / R.fakeProgress.periodMs) * 1.2);

  /* 2. voice level (fake voice, rules.fakeVoice) */
  if (t > m.voiceNext) {
    const pause = Math.random() < 0.18;
    m.voiceTarget = pause ? 0.04 : 0.35 + Math.random() * 0.65;
    m.voiceNext = t + (pause ? 180 + Math.random() * 220 : 70 + Math.random() * 110);
  }
  let lvGoal = 0;
  if (S.bind && !still) lvGoal = m.voiceTarget * (m.state === 'listening' ? R.listeningGain.value : 1);
  m.lvl += (lvGoal - m.lvl) * R.levelSmoothing.value;
  const lvl = m.lvl;

  /* 3. pose: move every number toward the state's target */
  let T: Pose = { ...SPEC.poseDefaults, ...(S.pose || {}) };
  let smooth = R.poseSmoothing.value;
  if (K) {
    T = sampleKeys(K, Math.min(1, (lt % cyc) / K.durationMs), T);
    smooth = R.keySmoothing.value;
  }
  for (const key in T) {
    const k = key as keyof Pose;
    m.P[k] += (T[k] - m.P[k]) * smooth;
  }
  let { lean, lift, sx, sy, armL, armR, eyeDx, eyeDy, mouthW, mouthH, x, footL, footR, leafTilt, leaf } = m.P;
  const { armSy, eyeSy, mouth, dim, spin, eyeLSy, eyeRSy, cheek, stem, leafS, armLx, armRx, flat } = m.P;
  let xc = 0;

  /* 4. looping motion */
  if (M) {
    const ph = (lt % M.period) / M.period;
    if (M.type === 'breathe') lift -= M.amp * (0.5 - 0.5 * Math.cos(TAU * ph));
    if (M.type === 'sway') lean += M.amp * Math.sin(TAU * ph);
    if (M.type === 'shake') x += M.amp * Math.sin(t / 40) * Math.max(0, 1 - ph * 3);
    if (M.type === 'sleep') { const u = 0.5 - 0.5 * Math.cos(TAU * ph); sy *= 1 - M.amp * u; sx *= 1 + M.amp * 0.5 * u; }
    if (M.type === 'hop') {
      if (ph < 0.6) { const u = Math.sin((Math.PI * ph) / 0.6); lift -= M.amp * u; sy *= 1 + 0.06 * u; sx *= 1 - 0.04 * u; }
      else { const u = Math.sin((Math.PI * (ph - 0.6)) / 0.4); sy *= 1 - 0.12 * u; sx *= 1 + 0.08 * u; }
    }
    if (M.type === 'nod') { const u = ph < 0.5 ? Math.sin(Math.PI * ph * 4) ** 2 : 0; lift += M.amp * u; eyeDy += 0.35 * u; leaf -= 10 * u; }
    if (M.type === 'dance') {
      const s = Math.sin(TAU * ph);
      lift -= M.amp * 0.4 * Math.abs(s); lean += 5 * s; x += 0.8 * s; leafTilt += 10 * s;
      footL += 0.9 * Math.max(0, s); footR += 0.9 * Math.max(0, -s); armL -= 0.6 + 2.2 * Math.max(0, s); armR -= 0.6 + 2.2 * Math.max(0, -s);
    }
    if (M.type === 'float') { const s = Math.sin(TAU * ph); lift -= M.amp * (1 + 0.22 * s); leafTilt += 5 * Math.sin(TAU * ph + 1); footL += 0.35 + 0.2 * s; footR += 0.35 - 0.2 * s; }
    if (M.type === 'tap') footR += M.amp * (ph < 0.5 ? Math.max(0, Math.sin(TAU * ph * 4)) : 0);
    if (M.type === 'look') { const s = Math.sin(TAU * ph); lean += M.amp * s; eyeDx += 0.7 * s; x += 0.5 * s; leafTilt -= 6 * s; }
    if (M.type === 'read') { const line = (ph * 3) % 1; eyeDx += M.amp * (2 * ease(clamp(line * 1.25)) - 1); eyeDy += 0.25 * (Math.floor(ph * 3) - 1); }
    if (M.type === 'work') { const s = Math.sin(TAU * ph); armL -= M.amp * Math.max(0, s); armR -= M.amp * Math.max(0, -s); lift += 0.12 * Math.abs(s); }
    if (M.type === 'flip') {
      if (ph < 0.14) { const u = Math.sin((Math.PI * ph) / 0.14); sy *= 1 - 0.16 * u; sx *= 1 + 0.1 * u; }
      else if (ph < 0.7) { const u = (ph - 0.14) / 0.56; lift -= M.amp * 4 * u * (1 - u); sy *= 1 + 0.05 * Math.sin(Math.PI * u); }
      else if (ph < 0.84) { const u = Math.sin((Math.PI * (ph - 0.7)) / 0.14); sy *= 1 - 0.14 * u; sx *= 1 + 0.09 * u; }
    }
  }
  const flipSpin = M && M.type === 'flip' && (lt % M.period) / M.period >= 0.14 && (lt % M.period) / M.period < 0.7 ? 360 * (((lt % M.period) / M.period - 0.14) / 0.56) : 0;
  if (!still && S.ring) { const rp = (lt % S.ring.period) / S.ring.period; xc = rp < 0.45 ? S.ring.amp * Math.sin(lt / 28) : 0; }
  if (!still && S.armWave) armR += S.armWave.amp * Math.sin((TAU * t) / S.armWave.period);

  /* 5. things that follow the voice level */
  const B = S.bind || {};
  if (B.ears) { armL -= B.ears * lvl; armR -= B.ears * lvl; }
  if (B.mouth) { mouthH = 0.3 + 2.1 * lvl; mouthW = 1 + 0.5 * lvl; }
  if (B.lift) lift -= B.lift * lvl;
  if (B.arms) { armL -= B.arms * lvl; armR -= B.arms * 0.8 * (1 - lvl); }
  if (B.look && !still) {
    // No pointer on a phone: the page's fallback, a slow look around.
    eyeDx += 0.7 * Math.sin(t / 900); eyeDy += 0.25 * Math.sin(t / 1300); lean += 3 * Math.sin(t / 900); x += 0.3 * Math.sin(t / 900); leafTilt -= 8 * Math.sin(t / 900);
  }

  /* 6. blink */
  let blink = 1;
  if (!S.noBlink && !still) {
    if (t > m.nextBlink) { m.blinkEnd = t + R.blink.closedMs; m.nextBlink = t + R.blink.everyMs[0] + Math.random() * (R.blink.everyMs[1] - R.blink.everyMs[0]); }
    if (t < m.blinkEnd) blink = R.blink.closedScale;
  }

  /* 8. colors */
  const body = mix(C.body, C.dimTo, dim);
  const tint = (c: RGB) => mix(c, C.dimTo, dim);
  const dimmed = mix(body, C.dimTo, 0.8);
  const fillOn = (i: number) => (B.fill ? mix(dimmed, body, clamp(prog * N - i)) : body);
  const parts: KaiPart[] = [];
  const add = (name: string, group: KaiPart['group'], x0: number, y0: number, w: number, h: number, color: RGB, a = 1) =>
    parts.push({ name, group, x: x0, y: y0, w, h, color, a });

  /* 9. limbs and leaf */
  const [lx, ly, lw, lh] = ch.arms.left, rx = ch.arms.right[0], armH = lh * armSy;
  const grow = ch.stem[3] * (stem - 1);
  add('stem', 'stem', ch.stem[0], ch.stem[1] - grow, ch.stem[2], ch.stem[3] * stem, tint(C.leaf));
  for (const [side, rects] of [['leafL', ch.leafLeft], ['leafR', ch.leafRight]] as const) {
    add('leaf', side, rects[0][0], rects[0][1], rects[0][2], rects[0][3], tint(C.leaf));
    add('leaf', side, rects[1][0], rects[1][1], rects[1][2], rects[1][3], tint(C.leafHi));
  }
  ch.feet.forEach((f, i) => add('foot', 'body', f[0], f[1] - (i ? footR : footL), f[2], f[3], tint(C.shade)));
  add('arm', 'body', lx - armLx, ly + lh / 2 + armL - armH / 2, lw + armLx, armH, fillOn(0));
  add('arm', 'body', rx, ly + lh / 2 + armR - armH / 2, lw + armRx, armH, fillOn(N - 1));

  /* 10. slabs */
  for (let i = 0; i < N; i++) {
    const H = i === 0 || i === N - 1 ? ch.slab.outerHeight : ch.slab.height;
    add('slab', 'body', ch.slab.x0 + i * ch.slab.step, ch.slab.centerY - H / 2, ch.slab.width + 0.02, H, fillOn(i));
  }
  add('hi', 'body', ch.hiRow[0], ch.hiRow[1], ch.hiRow[2], ch.hiRow[3], tint(C.hi), 1 - flat);
  add('lo', 'body', ch.loRow[0], ch.loRow[1], ch.loRow[2], ch.loRow[3], tint(C.shade), 1 - flat);
  for (const c of ch.cheeks) add('cheek', 'body', c[0], c[1], c[2], c[3], tint(C.leafHi), clamp(cheek));

  /* 11. eyes and mouth */
  const ey = ch.eyes.centerY + eyeDy;
  for (let i = 0; i < 2; i++) {
    const eh = ch.eyes.height * eyeSy * (i ? eyeRSy : eyeLSy) * blink;
    add('eye', 'body', ch.eyes.x[i] + eyeDx, ey - eh / 2, ch.eyes.width, eh, C.eye);
  }
  const mw = ch.mouth.width * mouthW, mh = ch.mouth.height * mouthH;
  add('mouth', 'body', ch.mouth.center[0] - mw / 2, ch.mouth.center[1] - mh / 2, mw, mh, C.eye, mouth);

  /* effects: each fades in and out over 0.3 s, as the page's CSS transition */
  const fx: KaiRect[] = [], text: KaiText[] = [];
  for (const name of FX) {
    const goal = !still && S.fx === name ? 1 : 0;
    const a = m.fxA[name] ?? 0;
    const next = a + Math.sign(goal - a) * Math.min(Math.abs(goal - a), dt / FX_FADE_MS);
    m.fxA[name] = next;
    effect(name, t, lvl, next, fx, text);
  }

  return {
    shadow: { cx: ch.shadow.center[0] + x, cy: ch.shadow.center[1], rx: ch.shadow.rx * (1 - 0.5 * clamp(-lift / 6)), ry: ch.shadow.ry, color: C.shadow, a: 1 - clamp((lift - 2) / 4) },
    pose: { tx: x + xc, ty: lift, lean, sx, sy, spin: spin + flipSpin },
    leafL: { dy: -grow, s: Math.max(0, leafS), rot: leaf + leafTilt },
    leafR: { dy: -grow, s: Math.max(0, leafS), rot: -leaf + leafTilt },
    parts, fx, text,
  };
}

export const KAI_VIEWBOX = SPEC.viewBox;
export const KAI_PIVOT = G.pivot;
export const KAI_SPIN_CENTER = G.spinCenter;
export const KAI_LEAF_PIVOT = G.chat.leafPivot;
export { lerp };
