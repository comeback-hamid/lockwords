import type { DecksStore, PlanStore, ProfilesStore } from '../app.js';
import { KaiAnswerSchema, type KaiAnswer, type KaiChat, type KaiContext } from '../llm/kai-chat.js';
import { listedLanguage } from '../onboarding/languages.js';
import type { Profile } from '../onboarding/profile.js';
import { wordInHistory, type KaiMessageWord, type KaiWord } from './abilities/words.js';
import { deckNote, NO_DECK_FACTS, plannedDeck, readyEvent, withPlanSize, type ChatDeck, type DeckEvent, type DeckFacts, type DeckIdea } from './abilities/decks.js';

// One turn of the New words chat: check the limits, tell Kai what it knows, save what it said.

export type KaiMessage = { id: string; from: 'kai' | 'user'; text: string; translation: string | null; options: string[]; opening: boolean; createdAt: Date; word?: KaiMessageWord; decks?: ChatDeck[] }; // word: a word card, decks: the deck cards under this line
export type KaiFacts = {
  name: string | null;
  translationOn: boolean | null; // null = the learner never chose
  words: KaiContext['words'];
  decks?: DeckFacts;
};
export type KaiTurnToSave = { user: string | null; kai: { text: string; translation: string }[]; options: string[]; opening: boolean; notes: { add: string[]; drop: number };
  word?: KaiWord | null; // a word card on Kai's last line
  decks?: { ideas: DeckIdea[]; cefr: string }; // saved as proposed decks and linked to Kai's last line
  readyDeckId?: string; // this turn tells the learner that this deck is ready; saved once per deck (a second one saves nothing)
};
export type KaiStore = {
  messages(userId: string, limit: number): Promise<KaiMessage[]>; // the newest `limit`, oldest first
  older?(userId: string, before: string, limit: number): Promise<KaiMessage[] | null>; // the `limit` just before that message, oldest first; null = not a message of this user
  lastOpeningAt(userId: string): Promise<Date | null>;
  userTurnsSince(userId: string, since: Date): Promise<number>;
  notes(userId: string): Promise<string[]>; // oldest first
  facts(userId: string, now: Date): Promise<KaiFacts>;
  setTranslation(userId: string, on: boolean): Promise<boolean>; // false = no profile
  saidReady?(userId: string, deckId: string): Promise<boolean>; // Kai already told the learner this deck is ready
  // All of it or nothing. One turn at a time per user. An opening is not saved when another one was saved in the last 12 hours
  // (two requests at once): the answer then has no messages.
  addTurn(userId: string, turn: KaiTurnToSave, now: Date): Promise<{ userMessage: KaiMessage | null; messages: KaiMessage[] }>;
};

export const SHOWN_MESSAGES = 50;
export const HISTORY_FOR_KAI = 20;
export const MAX_NOTES = 50;
export const MAX_TURNS_PER_DAY = 200;
export const OPENING_GAP_MS = 12 * 60 * 60 * 1000;
export const KAI_LIMIT_MS = 20_000;
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

// The profile keeps a code ("es") for a listed language and the typed name for any other. Kai is told the name.
const languageName = (saved: string) => listedLanguage(saved)?.name ?? saved;

export type TurnResult =
  | { ok: true; userMessage: KaiMessage | null; messages: KaiMessage[]; options: string[]; action: 'review' | null }
  | { ok: false; error: 'no_profile' | 'too_many_messages' | 'kai_unavailable' | 'not_found' | 'deck_not_ready' };

type Deps = { kai: KaiStore; profiles: ProfilesStore; kaiChat: KaiChat; decks?: DecksStore; plans?: PlanStore };
const NOTHING: TurnResult = { ok: true, userMessage: null, messages: [], options: [], action: null };

// The model's answer, checked. A wrong shape is asked for once more; a thrown call is not.
// Both tries share one limit of 20 seconds, so a turn never takes longer than that.
async function ask(kaiChat: KaiChat, ctx: KaiContext): Promise<KaiAnswer | null> {
  const deadline = Date.now() + KAI_LIMIT_MS;
  for (let attempt = 0; attempt < 2; attempt++) {
    const parsed = KaiAnswerSchema.safeParse(await kaiChat.answer(ctx, deadline));
    if (parsed.success) return parsed.data;
  }
  return null;
}

// `input` is the learner's text, null for Kai's opening, or an event from the app that Kai speaks about.
export async function kaiTurn(deps: Deps, userId: string, input: string | null | DeckEvent, now: Date): Promise<TurnResult> {
  const profile = await deps.profiles.get(userId);
  if (!profile) return { ok: false, error: 'no_profile' };
  const opening = input === null;
  const event = typeof input === 'object' && input !== null ? input : null;
  const text = typeof input === 'string' ? input : null;
  const ready = event ? await readyEvent(deps, userId, event.deckId) : null;
  if (ready === 'said') return NOTHING;
  if (typeof ready === 'string') return { ok: false, error: ready };

  if (opening) {
    const last = await deps.kai.lastOpeningAt(userId);
    if (last && now.getTime() - last.getTime() < OPENING_GAP_MS) return NOTHING;
  } else if (text !== null && (await deps.kai.userTurnsSince(userId, new Date(now.getTime() - DAY_MS))) >= MAX_TURNS_PER_DAY) {
    return { ok: false, error: 'too_many_messages' };
  }

  const [history, notes, facts, plan] = await Promise.all([deps.kai.messages(userId, HISTORY_FOR_KAI), deps.kai.notes(userId), deps.kai.facts(userId, now), text !== null && deps.plans ? deps.plans.get(userId) : null]);
  const planDeck = text !== null && plan ? plannedDeck(text, plan.items) : null;
  const ctx: KaiContext = {
    name: facts.name,
    learningLanguage: languageName(profile.learningLanguage),
    nativeLanguage: languageName(profile.nativeLanguage),
    cefr: profile.cefr,
    knownWords: profile.knownWords,
    goal: profile.goal,
    goalOther: profile.goalOther,
    interests: profile.interests,
    notes,
    history: history.map((m) => ({ from: m.from, text: wordInHistory(m.text, m.word) + deckNote(m.decks) })),
    words: { ...facts.words, sample: facts.words.sample.slice(0, 10) },
    opening,
    firstVisit: opening && history.length === 0,
    userText: text,
    decks: facts.decks ?? NO_DECK_FACTS,
    ...(planDeck ? { planDeck } : {}),
    ...(ready ? { event: { deckReady: ready } } : {}),
  };

  let answer: KaiAnswer | null;
  try {
    answer = await ask(deps.kaiChat, ctx);
  } catch {
    answer = null;
  }
  if (!answer) return { ok: false, error: 'kai_unavailable' };

  // Deck ideas come only after the learner said yes (never with the first hello) and never with "your deck is ready".
  const ideas = ctx.firstVisit || event ? undefined : withPlanSize(answer.decks, ctx.planDeck);
  const saved = await deps.kai.addTurn(
    userId,
    { user: text, kai: answer.lines, options: answer.options, opening, notes: nextNotes(notes, answer.remember), word: event ? null : answer.word, ...(ideas ? { decks: { ideas, cefr: profile.cefr ?? 'A1' } } : {}), ...(event ? { readyDeckId: event.deckId } : {}) },
    now,
  );
  if ((opening || event) && saved.messages.length === 0) return NOTHING; // another request opened, or said "ready", first
  return { ok: true, ...saved, options: answer.options, action: event ? null : answer.action };
}

// The newest 50 messages, or with `before` (a message id) the 50 just before that one. Null: `before` is not a message of this user.
// One more than a page is read, so the answer can say if older messages are left.
export async function readChat(deps: Pick<Deps, 'kai' | 'profiles'>, userId: string, now: Date, before?: string) {
  const [found, facts, profile] = await Promise.all([
    before === undefined ? deps.kai.messages(userId, SHOWN_MESSAGES + 1) : (deps.kai.older?.(userId, before, SHOWN_MESSAGES + 1) ?? null),
    deps.kai.facts(userId, now),
    deps.profiles.get(userId),
  ]);
  if (!found) return null;
  const messages = found.slice(-SHOWN_MESSAGES);
  const last = messages.at(-1);
  return {
    messages,
    hasMore: found.length > SHOWN_MESSAGES,
    options: before === undefined && last?.from === 'kai' ? last.options : [], // the options belong to the newest line only
    translationOn: defaultTranslationOn(facts.translationOn, profile?.cefr ?? null, profile?.level ?? 'beginner'),
    nativeLanguage: profile?.nativeLanguage ?? null, // the translation button shows its code ("EN")
  };
}
