import type { z } from 'zod';

import { checkLanguagePrompt, LanguageCheckSchema, type LanguageChecker } from './check-language.js';
import { buildKaiPrompt, type KaiChat } from './kai-chat.js';
import { CardsSchema, DECK_SIZE, ProposalSchema, type DeckInput, type DeckMaker } from './make-deck.js';
import { UseItSchema, type UseItJudge } from './use-it.js';

const MODEL = 'claude-sonnet-5-5';
const TIMEOUT_MS = 30_000;

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
    cards: async (i) =>
      (
        await ask(
          `${who(i)}\nPick exactly ${DECK_SIZE} useful ${i.learningLanguage} words or short phrases for this topic and level. Nouns keep their article. No duplicates.\nFor each: "word", "translation" (in ${i.nativeLanguage}), "example" (one natural sentence in ${i.learningLanguage} that uses the word), "exampleTranslation" (in ${i.nativeLanguage}).\nAnswer with JSON only: {"cards": [{"word": string, "translation": string, "example": string, "exampleTranslation": string}]}`,
          CardsSchema,
        )
      ).cards,
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

export function claudeLanguageChecker(apiKey: string, fetchFn: Fetch = fetch): LanguageChecker {
  const ask = asker(apiKey, fetchFn);
  return { check: (text) => ask(checkLanguagePrompt(text), LanguageCheckSchema) };
}

// 20 seconds in all, as two tries of 10: a normal answer takes 2 to 5 seconds, and in the real-AI check about one call
// in twenty stalled on the network. A second try answers in time; one long wait would not.
const KAI_TRY_MS = 10_000;
const KAI_TRIES = 2;

// One turn of the New words chat. Returns the model's JSON as it is: src/kai/chat.ts checks the shape and asks once more if it is wrong.
// Low effort and no thinking (`between_tools` is how this model turns it off): the learner is waiting, and the answer is a few short lines.
export function claudeKaiChat(apiKey: string, fetchFn: Fetch = fetch): KaiChat {
  async function call(system: string, user: string): Promise<string> {
    const res = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, thinking: { type: 'between_tools' }, output_config: { effort: 'low' }, system, messages: [{ role: 'user', content: user }] }),
      signal: AbortSignal.timeout(KAI_TRY_MS),
    });
    if (!res.ok) throw new Error(`model answered ${res.status}`);
    const body = (await res.json()) as { content?: { type: string; text?: string }[] };
    return body.content?.find((c) => c.type === 'text')?.text ?? '';
  }
  return {
    async answer(ctx) {
      const { system, user } = buildKaiPrompt(ctx);
      let text: string;
      for (let attempt = 1; ; attempt++) {
        try {
          text = await call(system, user);
          break;
        } catch (e) {
          if (attempt >= KAI_TRIES) throw e;
        }
      }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end < start) return null; // not JSON: a wrong shape, the service asks once more
      try {
        return JSON.parse(text.slice(start, end + 1)) as unknown;
      } catch {
        return null;
      }
    },
  };
}
