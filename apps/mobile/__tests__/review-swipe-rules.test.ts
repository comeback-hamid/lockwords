import { flyTarget, labelStrength, SWIPE_DISTANCE, swipeDirection } from '@/review/swipe';
import { wordSize } from '@/review/word-size';

// The swipe rules are plain functions, so the gesture (which runs on the UI thread) can be checked here.
describe('swipe label strength', () => {
  test('nothing at rest', () => {
    expect(labelStrength(0, 0)).toEqual({ easy: 0, hard: 0, known: 0 });
  });

  test('grows with the finger and is full at the threshold', () => {
    expect(labelStrength(SWIPE_DISTANCE / 3, 0).easy).toBeCloseTo(1 / 3);
    expect(labelStrength(SWIPE_DISTANCE / 2, 0).easy).toBeCloseTo(0.5);
    expect(labelStrength(SWIPE_DISTANCE, 0).easy).toBe(1);
    expect(labelStrength(SWIPE_DISTANCE * 3, 0).easy).toBe(1); // never more than full
  });

  test('right = Easy, left = Hard, up = Know it; only one label at a time', () => {
    expect(labelStrength(45, 0)).toEqual({ easy: 0.5, hard: 0, known: 0 });
    expect(labelStrength(-45, 0)).toEqual({ easy: 0, hard: 0.5, known: 0 });
    expect(labelStrength(0, -45)).toEqual({ easy: 0, hard: 0, known: 0.5 });
    expect(labelStrength(10, -90)).toEqual({ easy: 0, hard: 0, known: 1 });
    expect(labelStrength(0, 60)).toEqual({ easy: 0, hard: 0, known: 0 }); // down is not a swipe
  });
});

describe('what a release does', () => {
  test('past the threshold: the direction', () => {
    expect(swipeDirection(SWIPE_DISTANCE + 1, 0, 0, 0)).toBe('easy');
    expect(swipeDirection(-SWIPE_DISTANCE - 1, 0, 0, 0)).toBe('hard');
    expect(swipeDirection(0, -SWIPE_DISTANCE - 1, 0, 0)).toBe('known');
  });

  test('short of it: the card goes back', () => {
    expect(swipeDirection(SWIPE_DISTANCE - 1, 0, 0, 0)).toBeNull();
    expect(swipeDirection(0, SWIPE_DISTANCE * 2, 0, 0)).toBeNull(); // down
  });

  test('a fast flick counts before the threshold, a slow short move does not', () => {
    expect(swipeDirection(40, 0, 1200, 0)).toBe('easy');
    expect(swipeDirection(-40, 0, -1200, 0)).toBe('hard');
    expect(swipeDirection(0, -40, 0, -1200)).toBe('known');
    expect(swipeDirection(40, 0, 200, 0)).toBeNull();
    expect(swipeDirection(40, 0, -1200, 0)).toBeNull(); // flicked back
  });

  test('the card leaves the screen in that direction', () => {
    expect(flyTarget('easy', 0, 393, 852).x).toBeGreaterThan(393);
    expect(flyTarget('hard', 0, 393, 852).x).toBeLessThan(-393);
    expect(flyTarget('known', 0, 393, 852).y).toBeLessThan(-852);
  });
});

describe('word size (Figma: Flashcard · rules)', () => {
  test('a short word is 44, also a short phrase that fits on two lines', () => {
    expect(wordSize('la propina')).toBe(44);
    expect(wordSize('pagar')).toBe(44);
    expect(wordSize('tener ganas de')).toBe(44); // "tener" / "ganas de"
  });

  test('longer words and phrases step down: 36, 30, 24', () => {
    expect(wordSize('restaurante')).toBe(36); // one word of 11 letters
    expect(wordSize('desafortunado')).toBe(30); // one word of 13 letters
    expect(wordSize('echar de menos a alguien')).toBe(30); // "echar de menos" / "a alguien"
    expect(wordSize('estar de acuerdo con alguien')).toBe(24);
    expect(wordSize('¿Me puede traer la cuenta, por favor?')).toBe(24);
  });

  test('never under 24', () => {
    expect(wordSize('x'.repeat(200))).toBe(24);
  });
});
