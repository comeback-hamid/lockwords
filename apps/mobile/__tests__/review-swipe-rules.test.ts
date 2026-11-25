import { flyTarget, labelStrength, SWIPE_DISTANCE, swipeDirection } from '@/review/swipe';
import { wordLayout } from '@/review/word-size';

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

describe('word on the card (Hamid, 2026-11-25): one or two lines, never three; a word is never cut; a smaller font instead', () => {
  test('one word is always one line, and the font follows its length', () => {
    expect(wordLayout('pagar')).toEqual({ size: 44, lines: ['pagar'] });
    expect(wordLayout('bottleneck')).toEqual({ size: 39, lines: ['bottleneck'] });
    expect(wordLayout('restaurante')).toEqual({ size: 35, lines: ['restaurante'] });
    expect(wordLayout('desafortunado')).toEqual({ size: 30, lines: ['desafortunado'] });
    expect(wordLayout('x'.repeat(200))).toEqual({ size: 14, lines: ['x'.repeat(200)] }); // never under 14; the text shrinks itself after that
  });

  test('a short phrase takes one line with a smaller font', () => {
    expect(wordLayout('la propina')).toEqual({ size: 39, lines: ['la propina'] });
    expect(wordLayout('to brush up on')).toEqual({ size: 27, lines: ['to brush up on'] });
  });

  test('a longer phrase takes two lines, cut between words where the lines are most even', () => {
    expect(wordLayout('to give a presentation')).toEqual({ size: 32, lines: ['to give a', 'presentation'] });
    expect(wordLayout('¿Me puede traer la cuenta, por favor?')).toEqual({ size: 21, lines: ['¿Me puede traer la', 'cuenta, por favor?'] });
    for (const phrase of ['echar de menos a alguien', 'estar de acuerdo con alguien', 'a b c d e f g h i j k l m n o p q r s t']) expect(wordLayout(phrase).lines.length).toBeLessThanOrEqual(2);
  });
});
