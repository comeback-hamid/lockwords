import type { z } from 'zod';

import { CardsSchema, DECK_SIZE, ProposalSchema, type DeckInput, type DeckMaker } from './make-deck.js';

const MODEL = 'claude-sonnet-5-5';
const TIMEOUT_MS = 30_000;

// The real model. Used only when ANTHROPIC_API_KEY is set; tests pass a fake fetch.
// shortcut: plain fetch + one try; Langfuse prompts, tracing and "retry once" come with the llm client (see README.md).
export function claudeDeckMaker(apiKey: string, fetchFn: typeof fetch = fetch): DeckMaker {
  async function ask<T extends z.ZodType>(prompt: string, schema: T): Promise<z.infer<T>> {
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
  }

  const who = (i: DeckInput) =>
    `The learner speaks ${i.nativeLanguage} and is learning ${i.learningLanguage} at CEFR level ${i.cefr}. Their topic: "${i.topic}".`;

  return {
    propose: (i) =>
      ask(
        `${who(i)}\nWrite the title of a ${DECK_SIZE}-word flashcard deck for this topic: one short sentence in ${i.nativeLanguage} saying what they will be able to do. Also a reason of at most 4 words, like "For your trip".\nAnswer with JSON only: {"title": string, "reason": string}`,
        ProposalSchema,
      ),
    cards: async (i) =>
      (
        await ask(
          `${who(i)}\nPick exactly ${DECK_SIZE} useful ${i.learningLanguage} words or short phrases for this topic and level. Nouns keep their article. No duplicates.\nFor each: "word", "translation" (in ${i.nativeLanguage}), "example" (one natural sentence in ${i.learningLanguage} that uses the word), "exampleTranslation" (in ${i.nativeLanguage}).\nAnswer with JSON only: {"cards": [{"word": string, "translation": string, "example": string, "exampleTranslation": string}]}`,
          CardsSchema,
        )
      ).cards,
  };
}
