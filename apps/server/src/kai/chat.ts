import type { ProfilesStore } from '../app.js';
import { KaiAnswerSchema, type KaiAnswer, type KaiChat, type KaiContext } from '../llm/kai-chat.js';
import type { Profile } from '../onboarding/profile.js';

// One turn of the New words chat: check the limits, tell Kai what it knows, save what it said.

export type KaiMessage = { id: string; from: 'kai' | 'user'; text: string; translation: string | null; options: string[]; opening: boolean; createdAt: Date };
export type KaiFacts = {
  name: string | null;
  translationOn: boolean | null; // null = the learner never chose
  words: KaiContext['words'];
};
export type KaiTurnToSave = { user: string | null; kai: { text: string; translation: string }[]; options: string[]; opening: boolean; notes: { add: string[]; drop: number } };
export type KaiStore = {
  messages(userId: string, limit: number): Promise<KaiMessage[]>; // the newest `limit`, oldest first
  lastOpeningAt(userId: string): Promise<Date | null>;
  userTurnsSince(userId: string, since: Date): Promise<number>;
  notes(userId: string): Promise<string[]>; // oldest first
  facts(userId: string, now: Date): Promise<KaiFacts>;
  setTranslation(userId: string, on: boolean): Promise<boolean>; // false = no profile
  addTurn(userId: string, turn: KaiTurnToSave, now: Date): Promise<{ userMessage: KaiMessage | null; messages: KaiMessage[] }>; // all of it or nothing
};

export const SHOWN_MESSAGES = 50;
export const HISTORY_FOR_KAI = 20;
export const MAX_NOTES = 50;
export const MAX_TURNS_PER_DAY = 200;
export const OPENING_GAP_MS = 12 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Which notes to add (new ones only, each once) and how many of the oldest to drop so at most 50 stay.
export function nextNotes(existing: readonly string[], incoming: readonly string[]): { add: string[]; drop: number } {
  const add: string[] = [];
  for (const n of incoming) if (!existing.includes(n) && !add.includes(n)) add.push(n);
  return { add, drop: Math.max(0, existing.length + add.length - MAX_NOTES) };
}

// The learner's own choice wins. With none: on for A1 and A2, off from B1. No CEFR yet: follow the level from onboarding.
export function defaultTranslationOn(saved: boolean | null, cefr: string | null, level: Profile['level']): boolean {
  if (saved !== null) return saved;
  if (cefr) return /^A[12]/.test(cefr);
  return level === 'brand_new' || level === 'beginner' || level === 'some_basics';
}

export type TurnResult =
  | { ok: true; userMessage: KaiMessage | null; messages: KaiMessage[]; options: string[]; action: 'review' | null }
  | { ok: false; error: 'no_profile' | 'too_many_messages' | 'kai_unavailable' };

type Deps = { kai: KaiStore; profiles: ProfilesStore; kaiChat: KaiChat };

// The model's answer, checked. A wrong shape is asked for once more; a thrown call is not.
async function ask(kaiChat: KaiChat, ctx: KaiContext): Promise<KaiAnswer | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const parsed = KaiAnswerSchema.safeParse(await kaiChat.answer(ctx));
    if (parsed.success) return parsed.data;
  }
  return null;
}

// `input` is the learner's text, or null for Kai's opening.
export async function kaiTurn(deps: Deps, userId: string, input: string | null, now: Date): Promise<TurnResult> {
  const profile = await deps.profiles.get(userId);
  if (!profile) return { ok: false, error: 'no_profile' };
  const opening = input === null;

  if (opening) {
    const last = await deps.kai.lastOpeningAt(userId);
    if (last && now.getTime() - last.getTime() < OPENING_GAP_MS) return { ok: true, userMessage: null, messages: [], options: [], action: null };
  } else if ((await deps.kai.userTurnsSince(userId, new Date(now.getTime() - DAY_MS))) >= MAX_TURNS_PER_DAY) {
    return { ok: false, error: 'too_many_messages' };
  }

  const [history, notes, facts] = await Promise.all([deps.kai.messages(userId, HISTORY_FOR_KAI), deps.kai.notes(userId), deps.kai.facts(userId, now)]);
  const ctx: KaiContext = {
    name: facts.name,
    learningLanguage: profile.learningLanguage,
    nativeLanguage: profile.nativeLanguage,
    cefr: profile.cefr,
    knownWords: profile.knownWords,
    goal: profile.goal,
    goalOther: profile.goalOther,
    interests: profile.interests,
    notes,
    history: history.map((m) => ({ from: m.from, text: m.text })),
    words: { ...facts.words, sample: facts.words.sample.slice(0, 10) },
    opening,
    firstVisit: opening && history.length === 0,
    userText: input,
  };

  let answer: KaiAnswer | null;
  try {
    answer = await ask(deps.kaiChat, ctx);
  } catch {
    answer = null;
  }
  if (!answer) return { ok: false, error: 'kai_unavailable' };

  const saved = await deps.kai.addTurn(userId, { user: input, kai: answer.lines, options: answer.options, opening, notes: nextNotes(notes, answer.remember) }, now);
  return { ok: true, ...saved, options: answer.options, action: answer.action };
}

export async function readChat(deps: Pick<Deps, 'kai' | 'profiles'>, userId: string, now: Date) {
  const [messages, facts, profile] = await Promise.all([deps.kai.messages(userId, SHOWN_MESSAGES), deps.kai.facts(userId, now), deps.profiles.get(userId)]);
  const last = messages.at(-1);
  return {
    messages,
    options: last?.from === 'kai' ? last.options : [],
    translationOn: defaultTranslationOn(facts.translationOn, profile?.cefr ?? null, profile?.level ?? 'beginner'),
  };
}
