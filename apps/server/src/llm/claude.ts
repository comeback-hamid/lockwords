import type { z } from 'zod';

import { CardsSchema, DECK_SIZE, ProposalSchema, type DeckInput, type DeckMaker } from './make-deck.js';
import { checkReply, type KaiReplier } from './kai-reply.js';
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

// Kai reads typed text in a Kai chat: Haiku 5.5 (the learner waits, so speed over depth), 8 s.
const KAI_MODEL = 'claude-haiku-5-5';
const KAI_TIMEOUT_MS = 8_000;
const KAI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['onScript', 'answer', 'lines'],
  properties: { onScript: { type: 'boolean' }, answer: { type: 'string' }, lines: { type: 'array', items: { type: 'string' } } },
};
const KAI_SYSTEM =
  'You are Kai, the friendly tutor in a language-learning app (Lockwords), in an onboarding chat. Speak as yourself (I, me), never about "Kai". You read one message the learner typed and decide if it answers the current question. If it does, return onScript true and the answer. If it does not (a question, small talk, anything else), return onScript false and 1 or 2 very short lines (each under 120 characters) that answer them kindly, each with one emoji, key words in **bold**, in English. Never ask a new question and never change the subject of the chat: the app asks its own question again after your lines.';
const KAI_ANSWER: Record<string, string> = {
  name: 'the name only (for "I am Maya" → "Maya"); Kai asked their name to greet them',
  language: '"native" if they want to chat in the first option, "target" for the second option',
  topic: 'the topic they want words for, in their words',
  ready: '"practice" if they want to practice now, "wordsFirst" if they want to see the words first',
  proposed: 'nothing: every message is off the script here (Kai just showed their first deck of 10 words; they tap Generate to make it)',
  generating: 'nothing: every message is off the script here (Kai is making their first 10 words right now; it takes a few seconds)',
};

export function claudeKaiReplier(apiKey: string, fetchFn: Fetch = fetch): KaiReplier {
  return {
    reply: async (i) => {
      const prompt = `Learner: speaks ${i.nativeLanguage}, learning ${i.learningLanguage}${i.name ? `, name ${i.name}` : ''}.
Current step: ${i.step}. An on-script answer is ${KAI_ANSWER[i.step]}.
Options on screen: ${i.options.length ? i.options.map((o) => `"${o}"`).join(', ') : 'none'}.
They typed: "${i.text}"`;
      const res = await fetchFn('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: KAI_MODEL,
          max_tokens: 1000,
          system: KAI_SYSTEM,
          messages: [{ role: 'user', content: prompt }],
          output_config: { effort: 'low', format: { type: 'json_schema', schema: KAI_SCHEMA } },
        }),
        signal: AbortSignal.timeout(KAI_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`model answered ${res.status}`);
      const body = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
      if (body.stop_reason === 'refusal') throw new Error('model refused');
      const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
      const r = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as { onScript: boolean; answer: string; lines: string[] };
      return checkReply(i.step, r.onScript ? { onScript: true, answer: r.answer } : { onScript: false, lines: r.lines });
    },
  };
}
