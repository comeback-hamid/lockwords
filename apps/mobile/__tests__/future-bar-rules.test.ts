import { aboutDate, ahead, ghostTrees, levelCard, place, pointAt } from '@/progress/future';
import { futureMeadow, nowMeadow } from '@/progress/meadow';

// The rules of the future bar (Hamid, 2026-11-25).
const stops = [100, 200, 500, 1000].map((words) => ({ words, by: '2027-01-01' }));

test('the stops sit at equal steps on the bar; words between two stops sit between them', () => {
  expect([0, 100, 200, 500, 1000, 5000].map(place)).toEqual([0, 0.25, 0.5, 0.75, 1, 1]);
  expect(place(50)).toBeCloseTo(0.125);
  expect(place(350)).toBeCloseTo(0.625);
});

test('the handle rests on today or on the nearest stop ahead, never behind today', () => {
  const left = ahead(120, stops);
  expect(left.map((s) => s.words)).toEqual([200, 500, 1000]);
  expect(pointAt(0, 120, left)).toBe(-1); // dragged back: today
  expect(pointAt(place(120) + 0.02, 120, left)).toBe(-1);
  expect(pointAt(0.52, 120, left)).toBe(0);
  expect(pointAt(0.8, 120, left)).toBe(1);
  expect(pointAt(2, 120, left)).toBe(2);
});

test('the day of a stop: a day in this year, only the month in another year', () => {
  expect(aboutDate('2026-12-05', 2026)).toBe('ABOUT DEC 5');
  expect(aboutDate('2028-01-15', 2026)).toBe('ABOUT JAN 2028');
});

test('the level card: a tag and one sentence, or only the words when there is no word test', () => {
  expect(levelCard(500, 'B1', 2530)).toEqual({ tag: 'B1 · ABOUT 2,500 WORDS', line: 'You can follow most everyday talk and explain your opinion.' });
  expect(levelCard(1000).tag).toBe('1,000 WORDS');
});

test('grey trees today: the trees still to grow before the next stop, two at most, none after the last stop', () => {
  expect(ghostTrees(90, stops[0])).toBe(1);
  expect(ghostTrees(10, stops[0])).toBe(2);
  expect(ghostTrees(1200, undefined)).toBe(0);
  const scene = nowMeadow([[2, 2]], [10], 1);
  expect(scene.trees).toBe(2);
});

test('a bigger forest is drawn with smaller blocks, so the picture never gets taller than its box', () => {
  const small = futureMeadow(100, 0.46);
  const big = futureMeadow(1000, 0.46);
  expect(small.trees).toBe(3);
  expect(big.trees).toBe(33);
  expect(big.width).toBeGreaterThan(small.width);
  for (const scene of [small, big]) expect(scene.height / scene.width).toBeLessThanOrEqual(0.46);
});
