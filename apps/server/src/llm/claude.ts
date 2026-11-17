import type { z } from 'zod';

import { z as zod } from 'zod';

import { checkCards, DECK_SIZE, DECK_SYSTEM_PROMPT, deckPrompt, ProposalSchema, type DeckInput, type DeckMaker } from './make-deck.js';
import { UseItSchema, type UseItJudge } from './use-it.js';

const MODEL = 'claude-sonnet-5-5';
const TIMEOUT_MS = 30_000;
const DECK_TIMEOUT_MS = 60_000; // Sonnet takes 14–20 s for 10 cards (vocab-engine 2.3)

// The real model. Used only when ANTHROPIC_API_KEY is set; tests pass a fake fetch.
// shortcut: plain fetch + one try; Langfuse prompts, tracing and "retry once" come with the llm client (see README.md).
type Fetch = typeof fetch;

// One model call that must answer with JSON matching `schema`.
function asker(apiKey: string, fetchFn: Fetch) {
  return async function ask<T extends z.ZodType>(prompt: string, schema: T): Promise<z.infer<T>> {
    const res = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`model answered ${res.status}`);
    const body = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1); // the model may wrap the JSON in words or a code block
    return schema.parse(JSON.parse(json));
  };
}

// The deck words: vocab-engine 2.3 prompt, Sonnet 5.5 at effort low, JSON schema output.
const DECK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['word', 'translation', 'example', 'example_translation'],
        properties: { word: { type: 'string' }, translation: { type: 'string' }, example: { type: 'string' }, example_translation: { type: 'string' } },
      },
    },
  },
};
const DeckAnswer = zod.object({
  cards: zod.array(zod.object({ word: zod.string().nullish(), translation: zod.string().nullish(), example: zod.string().nullish(), example_translation: zod.string().nullish(), exampleTranslation: zod.string().nullish() })),
});

async function askDeck(apiKey: string, fetchFn: Fetch, i: DeckInput) {
  const res = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      system: DECK_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: deckPrompt(i) }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema: DECK_SCHEMA } },
    }),
    signal: AbortSignal.timeout(DECK_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`model answered ${res.status}`);
  const body = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
  if (body.stop_reason === 'refusal') throw new Error('model refused');
  const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const { cards } = DeckAnswer.parse(JSON.parse(json));
  return checkCards(cards.map((c) => ({ word: c.word, translation: c.translation, example: c.example, exampleTranslation: c.example_translation ?? c.exampleTranslation })));
}

export function claudeDeckMaker(apiKey: string, fetchFn: Fetch = fetch): DeckMaker {
  const ask = asker(apiKey, fetchFn);

  const who = (i: DeckInput) =>
    `The learner speaks ${i.nativeLanguage} and is learning ${i.learningLanguage} at CEFR level ${i.cefr}. Their topic: "${i.topic}".`;

  return {
    propose: (i) =>
      ask(
        `${who(i)}\nWrite the title of a ${DECK_SIZE}-word flashcard deck for this topic: one short sentence in ${i.nativeLanguage} saying what they will be able to do. Also a reason of at most 4 words, like "For your trip".\nAnswer with JSON only: {"title": string, "reason": string}`,
        ProposalSchema,
      ),
    cards: (i) => askDeck(apiKey, fetchFn, i),
  };
}

export function claudeUseItJudge(apiKey: string, fetchFn: Fetch = fetch): UseItJudge {
  const ask = asker(apiKey, fetchFn);
  return {
    check: (i) =>
      ask(
        `A learner who speaks ${i.nativeLanguage} is learning ${i.learningLanguage}. They wrote one sentence to practice the word "${i.word}" (${i.translation}):\n"${i.sentence}"\nJudge it kindly. "good" is true when the word is used correctly and the sentence can be understood (small mistakes are fine).\nAnswer as Kai, a friendly tutor, in ${i.nativeLanguage}: 1 to 4 very short lines, each starting with one emoji, key words in **bold**. If good: praise, then one tip or a more natural way to say it. If not: say what is wrong and how to fix it.\nAnswer with JSON only: {"good": boolean, "lines": string[]}`,
        UseItSchema,
      ),
  };
}
