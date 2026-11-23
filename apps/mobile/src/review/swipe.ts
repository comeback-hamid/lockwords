import type { Direction } from '@/api/client';
import { card } from '@/theme/theme';

// The swipe rules of the word card. Plain functions marked as worklets: the gesture calls them on the UI thread,
// and Jest calls them like any function.
export const SWIPE_DISTANCE = card.swipeDistance;
const FLICK_SPEED = 800; // points per second: a fast flick counts before the threshold
const FLICK_MIN = 30;

const clamp01 = (n: number) => {
  'worklet';
  return Math.min(1, Math.max(0, n));
};

// How strong each label is while the finger moves: 0 at rest, 1 at the threshold. Only one label shows at a time.
export function labelStrength(x: number, y: number): { easy: number; hard: number; known: number } {
  'worklet';
  const up = -y;
  if (up > Math.abs(x)) return { easy: 0, hard: 0, known: clamp01(up / SWIPE_DISTANCE) };
  return { easy: clamp01(x / SWIPE_DISTANCE), hard: clamp01(-x / SWIPE_DISTANCE), known: 0 };
}

// What a release does: a direction (the card flies off) or null (the card goes back).
export function swipeDirection(x: number, y: number, vx: number, vy: number): Direction | null {
  'worklet';
  const up = -y;
  if (up > Math.abs(x)) return up > SWIPE_DISTANCE || (up > FLICK_MIN && -vy > FLICK_SPEED) ? 'known' : null;
  if (x > SWIPE_DISTANCE || (x > FLICK_MIN && vx > FLICK_SPEED)) return 'easy';
  if (x < -SWIPE_DISTANCE || (x < -FLICK_MIN && vx < -FLICK_SPEED)) return 'hard';
  return null;
}

// Where the card goes when it leaves: off the screen, in its direction.
export function flyTarget(direction: Direction, y: number, width: number, height: number): { x: number; y: number } {
  'worklet';
  if (direction === 'known') return { x: 0, y: -height * 1.2 };
  return { x: (direction === 'easy' ? 1 : -1) * width * 1.5, y };
}
