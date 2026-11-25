// The widget's look rule (docs/product.md 7.4). iOS never tells us that a person saw a widget, so a "look" is a
// time slot: a hard word is on the widget for 30 minutes at a time, and has had its turn after 5 slots.
// Pure: `now` and the time zone are passed in. Looks never touch a card's stage, due date or hard mark.
import { offsetMinutes, validZone } from '../review/day.js';

export const SLOT_MINUTES = 30;
export const LOOKS = 5; // looks per word in one lap
const GROUP = 6; // words that take turns, so one word comes back about every 3 hours
const DAY_START = 7; // slots run 07:00 to 23:00 on the learner's clock: at night nobody has the chance to look
const DAY_END = 23;
const PLAN_HOURS = 48;
const SLOT_MS = SLOT_MINUTES * 60_000;
const HOUR_MS = 3_600_000;

export type HardWord = { cardId: string; word: string; translation: string; createdAt: Date; looks: number };
export type KeptSlot = { at: Date; end: Date; cardId: string; newLap?: true }; // newLap: this slot starts a new lap (every word back to 0)
export type Slot = KeptSlot & { word: string; translation: string; look: number };
export type WidgetState = { slots: KeptSlot[]; looks: Record<string, number>; countedUntil: Date };

export const emptyState = (now: Date): WidgetState => ({ slots: [], looks: {}, countedUntil: now });

// The slots from now for the next 48 hours. The first one is the half hour we are in.
// shortcut: one clock offset for the whole plan, so a plan made just before a clock change is an hour off after it
// (twice a year, until the app is opened again).
export function slotTimes(now: Date, timeZone?: string): { at: Date; end: Date }[] {
  const offset = offsetMinutes(now, validZone(timeZone)) * 60_000;
  const until = now.getTime() + PLAN_HOURS * HOUR_MS;
  const times: { at: Date; end: Date }[] = [];
  let wall = Math.floor((now.getTime() + offset) / SLOT_MS) * SLOT_MS; // the learner's wall clock, as if it were UTC
  while (wall - offset < until) {
    const hour = new Date(wall).getUTCHours();
    if (hour >= DAY_START && hour < DAY_END) {
      times.push({ at: new Date(wall - offset), end: new Date(wall - offset + SLOT_MS) });
      wall += SLOT_MS;
    } else {
      const d = new Date(wall); // the night: go to the next 07:00
      wall = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (hour >= DAY_END ? 1 : 0), DAY_START);
    }
  }
  return times;
}

// Fewest looks first, then the oldest card. Words made in the same moment keep the order they came in (the store
// sorts by deck position).
const inOrder = (words: HardWord[]) => [...words].sort((a, b) => a.looks - b.looks || a.createdAt.getTime() - b.createdAt.getTime());

// Who takes turns, and who waits. The app asks for a new plan every time it opens, so the group must come out the
// same each time: the words whose looks have started stay in it, and the oldest waiting words fill it up to 6.
function pickGroup(words: HardWord[]): { group: HardWord[]; waiting: HardWord[] } {
  const open = words.filter((w) => w.looks < LOOKS);
  const started = inOrder(open.filter((w) => w.looks > 0)).slice(0, GROUP);
  const rest = inOrder(open.filter((w) => !started.includes(w)));
  const fill = rest.slice(0, GROUP - started.length);
  return { group: inOrder([...started, ...fill]), waiting: rest.slice(fill.length) };
}

export function makePlan(words: HardWord[], now: Date, timeZone?: string): { slots: Slot[]; endsAt: Date | null } {
  if (words.length === 0) return { slots: [], endsAt: null };
  let waiting: HardWord[] = [];
  let group: HardWord[] = [];
  const startLap = (reset: boolean) => {
    ({ group, waiting } = pickGroup(words.map((w) => ({ ...w, looks: reset ? 0 : Math.min(w.looks, LOOKS) }))));
  };
  startLap(false);
  const slots: Slot[] = [];
  for (const time of slotTimes(now, timeZone)) {
    let newLap = false;
    if (group.length === 0) {
      startLap(true); // every word had its 5 looks
      newLap = true;
    }
    const word = group.shift()!;
    word.looks += 1;
    slots.push({ ...time, cardId: word.cardId, word: word.word, translation: word.translation, look: word.looks, ...(newLap ? { newLap: true as const } : {}) });
    if (word.looks < LOOKS) group.push(word);
    else if (waiting.length > 0) group.unshift(waiting.shift()!); // the next word takes the free place and shows next
  }
  return { slots, endsAt: slots.at(-1)!.end };
}

// One look for every kept slot whose end has passed since the last count.
export function countPassed(state: WidgetState, now: Date): WidgetState {
  let looks = { ...state.looks };
  for (const slot of state.slots) {
    if (slot.end.getTime() <= state.countedUntil.getTime() || slot.end.getTime() > now.getTime()) continue;
    if (slot.newLap) looks = {};
    looks[slot.cardId] = Math.min((looks[slot.cardId] ?? 0) + 1, LOOKS);
  }
  return { ...state, looks, countedUntil: now };
}

// A word swiped Hard again starts at 0 looks. What already passed is counted first, so it cannot come back later.
export function resetLooks(state: WidgetState, cardId: string, now: Date): WidgetState {
  const counted = countPassed(state, now);
  return { ...counted, looks: Object.fromEntries(Object.entries(counted.looks).filter(([id]) => id !== cardId)) };
}
