import type { z } from 'zod';

import type { KaiContext } from '../../llm/kai-chat.js';
import { decksAbility } from './decks.js';

// What Kai can do in the New words chat beyond talking. Each ability lives in its own file and adds one line to each
// list here, so two sessions working at the same time do not edit the same lines (docs/parallel-work.md).
//
// An ability adds: optional fields on Kai's answer (Zod shape), a part of the prompt, facts for the context,
// and what the server saves when the field comes back. See openspec/changes/new-words-decks and new-words-single-words.
export type Ability = {
  answer: z.ZodRawShape; // optional fields on Kai's answer
  shape: string; // the same fields, as the prompt's JSON shape line shows them
  rules(c: KaiContext): string[]; // lines for the system prompt
  facts(c: KaiContext): string[]; // lines about this learner
  now?(c: KaiContext, lines: string[]): string[]; // changes what Kai is asked to do in this turn
};

export const abilities: readonly Ability[] = [
  decksAbility,
];

// The answer fields of every ability, with their types (spread one per line).
export const abilityAnswer = {
  ...decksAbility.answer,
};
