import type { z } from 'zod';

import { z as zod } from 'zod';

import { checkLanguagePrompt, LanguageCheckSchema, type LanguageChecker } from './check-language.js';
import { buildKaiPrompt, type KaiChat } from './kai-chat.js';
import { checkCards, DECK_SIZE, DECK_SYSTEM_PROMPT, deckPrompt, ProposalSchema, type DeckInput, type DeckMaker } from './make-deck.js';
import { checkReply, type KaiReplier } from './kai-reply.js';
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

export function claudeLanguageChecker(apiKey: string, fetchFn: Fetch = fetch): LanguageChecker {
  const ask = asker(apiKey, fetchFn);
  return { check: (text) => ask(checkLanguagePrompt(text), LanguageCheckSchema) };
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

// 20 seconds in all, as two tries of 10: a normal answer takes 2 to 5 seconds, and in the real-AI check about one call
// in twenty stalled on the network. A second try answers in time; one long wait would not.
const KAI_TRY_MS = 10_000;
const KAI_TRIES = 2;
const MIN_TRY_MS = 1500; // less than this is not worth a call

// One turn of the New words chat. Returns the model's JSON as it is: src/kai/chat.ts checks the shape and asks once more if it is wrong.
// Low effort and no thinking (`between_tools` is how this model turns it off): the learner is waiting, and the answer is a few short lines.
export function claudeKaiChat(apiKey: string, fetchFn: Fetch = fetch): KaiChat {
  async function call(system: string, user: string, ms: number): Promise<string> {
    const res = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, thinking: { type: 'between_tools' }, output_config: { effort: 'low' }, system, messages: [{ role: 'user', content: user }] }),
      signal: AbortSignal.timeout(ms),
    });
    if (!res.ok) throw new Error(`model answered ${res.status}`);
    const body = (await res.json()) as { content?: { type: string; text?: string }[] };
    return body.content?.find((c) => c.type === 'text')?.text ?? '';
  }
  return {
    async answer(ctx, deadline = Date.now() + KAI_TRY_MS * KAI_TRIES) {
      const { system, user } = buildKaiPrompt(ctx);
      let text: string;
      for (let attempt = 1; ; attempt++) {
        const left = deadline - Date.now();
        if (left < MIN_TRY_MS) throw new Error('no time left for the model');
        try {
          text = await call(system, user, Math.min(KAI_TRY_MS, left));
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
