// Lockwords funnel: small Claude calls.
//   POST /api/ai {action:"prompts", ...answers}  -> {prompts:[3 deck prompts in the page language]}
//   POST /api/ai {action:"estimate", ...test}    -> {words:<int>, cefr:"A2"}
//   POST /api/ai {action:"langpack", name}        -> demo words for a language the visitor typed (not in our list)
//   POST /api/ai {action:"deck", ...answers, prompt} -> {title, items:[10 cards], useit, useits:[up to 3]} (funnel v3; rate-limited per IP)
//   POST /api/ai {action:"check", word, meaning, sentence, ...} -> {verdict:"great"|"fixed"|"bad", better, tip} (funnel v3 Use it; rate-limited per IP)
//     each item also has "scene": a short English scene for its picture (sent to lw-img-background, see lib/sheet.mjs)
//   prompts with size (v3) also returns topics:[food|travel|work|daily|fun|health] per idea
// Needs ANTHROPIC_API_KEY in the Netlify site's environment. Without it, returns 503 and the page uses fixed text.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { deckMix } from "../../lib/level.mjs";

const MODEL = "claude-opus-5-5"; // cheaper/faster option: "claude-haiku-5-5"
const PACK_MODEL = "claude-haiku-5-5"; // the language pack is long; Haiku keeps it under ~10 s
// funnel v3 deck. Sonnet, not Opus (2026-11-02): on the site's key Opus at effort "low" came back with an empty deck in ~5 s,
// and at higher effort it ran past Netlify's ~30 s limit. Sonnet at "low": a level-fitting deck in ~17–20 s.
const DECK_MODEL = "claude-sonnet-5-5";
const CHECK_MODEL = "claude-sonnet-5-5"; // Use it sentence check (Haiku gave weak "not a sentence" answers)
const DECK_SIZE = 10;
const LANGS = { en: "English", es: "Spanish", pt: "Portuguese (Brazil)", it: "Italian", fr: "French", de: "German", tr: "Turkish", ru: "Russian", ar: "Arabic", ja: "Japanese", ko: "Korean", zh: "Chinese (Simplified)", fa: "Persian (Farsi)" };
const LEVELS = { a0: "A0 (starting from zero: knows no words yet)", a1: "A1 (new to it)", a2: "A2 (knows the basics)", b1: "B1 (simple chats)", b2: "B2+ (talks about most things)" };

const str = (v, n = 60) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n) : "");
const lang = v => (LANGS[v] ? v : "");
const list = (v, n = 25, len = 40) => (Array.isArray(v) ? v.slice(0, n).map(x => str(x, len)).filter(Boolean) : []);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const PromptsOut = z.object({ prompts: z.array(z.string()) });
// funnel v3 (size given): each idea also names the closest ready-made topic deck, used when the live deck is slow
const TOPICS = ["food", "travel", "work", "daily", "fun", "health"];
const PromptsOut3 = z.object({ prompts: z.array(z.object({ text: z.string(), topic: z.enum(TOPICS) })) });
const CheckOut = z.object({ verdict: z.enum(["great", "fixed", "bad"]), better: z.string(), tip: z.string() });
const EstimateOut = z.object({ words: z.number().int(), cefr: z.string() });
// The same concepts the funnel has in i18n/<code>.json "lex" (English source in brackets)
const LEX = { water: "water", friend: "friend", house: "house", eat: "to eat", sleep: "to sleep", achieve: "to achieve", challenge: "challenge", improve: "to improve", avoid: "to avoid", available: "available", overwhelming: "overwhelming", soothe: "to soothe", fleeting: "fleeting", unravel: "to unravel", conjecture: "conjecture", horse: "horse", f_apple: "apple", f_banana: "banana", f_orange: "orange", f_strawberry: "strawberry", f_grapes: "grapes", f_watermelon: "watermelon", f_pineapple: "pineapple", f_mango: "mango", f_cherry: "cherry", f_lemon: "lemon" };
const PackOut = z.object({
  known: z.boolean(),
  names: z.object(Object.fromEntries(Object.keys(LANGS).map(k => [k, z.string()]))),
  bcp47: z.string(),
  rtl: z.boolean(),
  lex: z.object(Object.fromEntries(Object.keys(LEX).map(k => [k, z.string()]))),
  test: z.object({ A: z.array(z.string()), B: z.array(z.string()), C: z.array(z.string()) }),
  use2: z.object({ said: z.string(), bad: z.string(), good: z.string(), fixed: z.string() })
});
// A target language the visitor typed: we pass its name instead of a code
const targetName = b => LANGS[lang(b.target)] || str(b.target_name, 40) || "Spanish";
const nativeName = b => LANGS[lang(b.native)] || str(b.native_name, 40) || "English";

// funnel v3: one 10-card deck made from the visitor's answers and the prompt they picked or wrote
const DeckOut = z.object({
  title: z.string(),
  items: z.array(z.object({ word: z.string(), reading: z.string(), translation: z.string(), meaning: z.string(), example: z.string(), example_translation: z.string(), scene: z.string() })),
  useit: z.array(z.object({ word: z.string(), sentence: z.string(), better: z.string(), tip: z.string(), alt: z.string() }))
});
// Best-effort rate limits (in memory, per function instance), per IP per 10 minutes: 20 decks, 30 sentence checks.
const RATE = { deck: 20, check: 30, ms: 10 * 60 * 1000 }, HITS = { deck: new Map(), check: new Map() };
function limited(ip, kind = "deck") {
  const now = Date.now(), m = HITS[kind], a = (m.get(ip) || []).filter(t => now - t < RATE.ms);
  if (a.length >= RATE[kind]) { m.set(ip, a); return true; }
  a.push(now); m.set(ip, a);
  if (m.size > 5000) for (const [k, v] of m) if (!v.length || now - v[v.length - 1] > RATE.ms) m.delete(k);
  return false;
}
const clientIp = (req, ctx) => (ctx && ctx.ip) || req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";

export default async (req, ctx) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "no_key" }, 503);
  let b;
  try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const client = new Anthropic({ timeout: 25000, maxRetries: 1 });

  try {
    if (b.action === "prompts") {
      const ui = lang(b.ui) || "en";
      const size = Number.isInteger(b.size) && b.size >= 5 && b.size <= 30 ? b.size : 0; // v3 sends size:10; v2 sends nothing
      const facts = [
        `Language they are learning: ${targetName(b)}`,
        `Native language: ${LANGS[lang(b.native)] || "unknown"}`,
        `Level: ${LEVELS[b.level] || "unknown"}`,
        `Main goal: ${str(b.goal, 20) || "unknown"}${str(b.reason) ? ` (in their words: "${str(b.reason)}")` : ""}`,
        `Interests: ${list(b.interests, 8, 20).join(", ") || "none given"}`,
        b.event ? `Coming up: ${str(b.event, 20)} on ${str(b.date, 10)}` : "No date coming up"
      ].join("\n");
      const r = await client.messages.parse({
        model: MODEL,
        max_tokens: 2048,
        output_config: { effort: "low", format: zodOutputFormat(size ? PromptsOut3 : PromptsOut) },
        system: "You write deck ideas for a vocabulary app. A deck is 30 words or short phrases the app builds from one sentence the learner types.",
        messages: [{ role: "user", content:
          `Learner:\n${facts}\n\nWrite 3 different deck prompts this learner would love, as if they typed them into the app. ` +
          `Write them in ${LANGS[ui]}. ` + (size
            ? `Write each one as a short topic title only (in ${LANGS[ui]}), like "Small talk at a business lunch" or "Checking into a hotel on a work trip": no "Create a deck…" or "words for" at the start, no quotes, sentence case, at most 8 words, specific to their goal, interests and level. `
            : `Use these deck sizes in order: 25, 20 and 30 words. Each one starts like "Create a deck of N words for …" with its own N (in ${LANGS[ui]}), is specific to their goal, interests, level and date, and is at most 16 words. `) +
          `Make them concrete (places, situations, topics), not generic. Mention the language they are learning only if it reads naturally. Write like a real person, short and simple.` +
          (size ? ` For each one also give "topic": the closest of ${TOPICS.join(", ")} (food = food and restaurants, travel = travel and getting around, work = work and jobs, daily = daily life, home, family and people, fun = hobbies, music, movies and games, health = health, sport and fitness).` : "") }]
      });
      if (size) {
        const o = (r.parsed_output?.prompts || []).map(x => ({ text: str(x && x.text, 140), topic: TOPICS.includes(x && x.topic) ? x.topic : "daily" })).filter(x => x.text).slice(0, 3);
        return o.length ? json({ prompts: o.map(x => x.text), topics: o.map(x => x.topic) }) : json({ error: "empty" }, 502);
      }
      const p = (r.parsed_output?.prompts || []).map(x => str(x, 140)).filter(Boolean).slice(0, 3);
      return p.length ? json({ prompts: p }) : json({ error: "empty" }, 502);
    }

    if (b.action === "estimate") {
      const tname = targetName(b);
      const k = b.known || {}, u = b.unknown || {};
      const lines = ["A", "B", "C"].map(x => `Level ${x}: knows [${list(k[x]).join(", ")}]; does not know [${list(u[x]).join(", ")}]`).join("\n");
      const r = await client.messages.parse({
        model: MODEL,
        max_tokens: 2048,
        output_config: { effort: "low", format: zodOutputFormat(EstimateOut) },
        system: "You estimate a language learner's receptive vocabulary size from a short yes/no word test, like a vocabulary-size test. Be realistic and conservative: people over-tick words they half know.",
        messages: [{ role: "user", content:
          `Language: ${tname}. The learner says their level is ${LEVELS[b.level] || "unknown"}.\n` +
          `They saw 20 common words (level A, about the 1,000 most frequent), 20 mid words (B, about 1,000–4,000) and 20 rarer words (C, about 4,000–10,000), and ticked the ones they know.\n${lines}\n\n` +
          `How many ${tname} words do they likely know? Give "words" as one integer (round to 50) and "cefr" as their likely level (A1, A2, B1, B2, C1 or C2).` }]
      });
      const o = r.parsed_output;
      if (!o) return json({ error: "empty" }, 502);
      return json({ words: Math.max(0, Math.min(30000, Math.round(o.words / 50) * 50)), cefr: str(o.cefr, 3).toUpperCase() });
    }
    if (b.action === "langpack") {
      const name = str(b.name, 40);
      if (!name) return json({ error: "name" }, 400);
      // funnel v3 sends bands:"lemma5k": its word test gives every word of a page the middle lemma rank of that page's band
      // (A 1–1,000, B 1,000–2,500, C 2,500–5,000 dictionary words). v2 sends nothing and keeps its old bands (its
      // "estimate" action describes them).
      const testBands = b.bands === "lemma5k"
        ? "A = among the 1,000 most common dictionary words, B = about 1,000–2,500, C = about 2,500–5,000; in each list order the words from most to least common"
        : "A = among the 1,000 most frequent words, B = about 1,000–4,000, C = about 4,000–10,000";
      const r = await client.messages.parse({
        model: PACK_MODEL,
        max_tokens: 6000,
        output_config: { effort: "low", format: zodOutputFormat(PackOut) },
        system: "You prepare a short vocabulary demo in one language for a language-learning app. Use the standard written form of the language, in its usual script.",
        messages: [{ role: "user", content:
          `A visitor typed this as the language they want to learn: "${name}". It may be misspelled or written in another language; work out which language they mean.\n` +
          `If it is not a real human language, set known=false and still fill every field for Spanish.\n\n` +
          `- names: the language's name written in each of these page languages (keys are codes): ${Object.entries(LANGS).map(([c, n]) => `${c}=${n}`).join(", ")}. Lowercase or capitalized as that language normally writes language names.\n` +
          `- bcp47: its BCP 47 tag for text-to-speech, e.g. "sv-SE". rtl: true if written right to left.\n` +
          `- lex: translate each English word into the language (verbs in dictionary form; nouns singular, with an article only if learners normally see one): ${JSON.stringify(LEX)}\n` +
          `- test: exactly 20 different real words in EACH of A, B and C (60 words in total), for a yes/no "which words do you know" test. ${testBands}. Single words, no translations.\n` +
          `- use2: one short everyday sentence that uses lex.f_banana and contains exactly one typical learner mistake. "said" = the sentence with the mistake, "bad" = the wrong part exactly as it appears in "said", "good" = the corrected part, "fixed" = the full corrected sentence (it must contain "good").` }]
      });
      const o = r.parsed_output;
      if (!o) return json({ error: "empty" }, 502);
      const clean = a => (Array.isArray(a) ? a.map(x => str(x, 40)).filter(Boolean).slice(0, 20) : []);
      const lex = Object.fromEntries(Object.keys(LEX).map(k => [k, str(o.lex[k], 40) || LEX[k]]));
      const names = Object.fromEntries(Object.keys(LANGS).map(k => [k, str(o.names[k], 40)]));
      const u2 = { said: str(o.use2.said, 160), bad: str(o.use2.bad, 60), good: str(o.use2.good, 60), fixed: str(o.use2.fixed, 160) };
      const okUse = u2.bad && u2.said.includes(u2.bad) && u2.good && u2.fixed.includes(u2.good);
      return json({ known: !!o.known, names, bcp47: str(o.bcp47, 15), rtl: !!o.rtl, lex, test: { A: clean(o.test.A), B: clean(o.test.B), C: clean(o.test.C) }, use2: okUse ? u2 : null });
    }
    if (b.action === "deck") {
      if (limited(clientIp(req, ctx))) return json({ error: "rate" }, 429);
      const prompt = str(b.prompt, 200);
      if (!prompt) return json({ error: "prompt" }, 400);
      const tname = targetName(b), nname = nativeName(b), uname = LANGS[lang(b.ui)] || nname;
      const est = Number.isFinite(b.estimate) ? Math.max(0, Math.min(5000, Math.round(b.estimate))) : null;
      const facts = [
        `Learning: ${tname}`,
        `Native language: ${nname}`,
        `Level (self-rated): ${LEVELS[b.level] || "unknown"}${est != null ? `; a short word test says they recognise about ${est >= 5000 ? "all" : est.toLocaleString("en")} of the 5,000 most common words` : ""}`,
        `Main goal: ${str(b.goal, 20) || "unknown"}${str(b.reason) ? ` (in their words: "${str(b.reason)}")` : ""}`,
        `Interests: ${list(b.interests, 8, 20).join(", ") || "none given"}`
      ].join("\n");
      const r = await client.messages.parse({
        model: DECK_MODEL,
        max_tokens: 5000,
        output_config: { effort: "low", format: zodOutputFormat(DeckOut) },
        system: "You make small personal vocabulary decks for a language-learning app. You are careful: every word is real, common in that language and correctly spelled, and every translation is correct. You write short, simple, natural sentences.",
        messages: [{ role: "user", content:
          `Learner:\n${facts}\n\nDeck they asked for (their words): "${prompt}"\n\n` +
          `Make a deck of exactly ${DECK_SIZE} different words or short phrases in ${tname} that fit the request, the learner's level, their goal and their interests.\nWhat to put in this deck for this learner's level: ${deckMix(b.level, est)}\n` +
          `For each item:\n` +
          `- word: in ${tname}, standard spelling, usual script. Nouns with the article learners normally see where the language has one (e.g. Spanish "la propina", German "das Trinkgeld", French "le pourboire"); verbs in dictionary form.\n` +
          `- reading: only for non-Latin scripts (Japanese: hiragana; Chinese: pinyin with tone marks; Korean: Revised Romanization; other scripts: a simple Latin transliteration). Otherwise "".\n` +
          `- translation: the word in ${nname}, 1 to 4 words.\n` +
          `- meaning: a simple definition in ${tname} with easy, common words, at most 10 words, without using the word itself.\n` +
          `- example: one short sentence in ${tname} (at most 12 words) at the learner's level, personal to their goal and interests, about the learner ("I", "my"). Wrap the form of the word used in the sentence in single asterisks, like *propina*.\n` +
          `- example_translation: that sentence in ${nname}, without asterisks.\n` +
          `- scene: one short, concrete description in English (at most 20 words) of a simple scene an illustrator can draw that shows the meaning: people and/or objects doing something. No text, letters, numbers or signs with writing in it. For an abstract word or a phrase, show a typical everyday moment where it is used.\n` +
          `title: a short deck name in ${uname}, 2 to 4 words, like "Ordering food".\n` +
          `useit: exactly 3 entries, for the 3 EASIEST of the ${DECK_SIZE} words (the ones this learner most likely finds easy), easiest first. word = exactly that item's "word". sentence = a short sentence in ${tname} (at most 12 words) a learner at this level might write with it, with exactly one small typical mistake for ${tname} learners. better = the same sentence with only that mistake fixed, natural. Wrap the word's form in *asterisks* in both. tip = one short, kind line in ${nname} (at most 12 words) that explains the fix. alt = a different short, correct, natural sentence in ${tname} (at most 12 words) with the same word at their level, on another idea than "sentence", with the word's form in *asterisks*.\n` +
          `Before you answer, check every item: Is the word real and correctly spelled? Does the example use exactly this word or phrase (not a synonym)? Is the translation right? Does it fit this learner's level and the easy / at-level / stretch mix above (replace any item a learner at this level surely knows already)? Does it fit their goal and interests? Is the example natural and does it contain the word? Fix anything wrong.` }]
      });
      const o = r.parsed_output;
      if (!o) return json({ error: "empty" }, 502);
      const items = (Array.isArray(o.items) ? o.items : []).map(x => ({
        word: str(x.word, 60), reading: str(x.reading, 80), translation: str(x.translation, 80), meaning: str(x.meaning, 160),
        example: str(x.example, 200), example_translation: str(x.example_translation, 200), scene: str(x.scene, 200)
      })).filter(x => x.word && x.translation && x.example);
      const seen = new Set(), uniq = items.filter(x => { const k = x.word.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      if (uniq.length < DECK_SIZE) return json({ error: "short", n: uniq.length, stop: r.stop_reason }, 502);
      const useits = (Array.isArray(o.useit) ? o.useit : [o.useit]).filter(Boolean)
        .map(u => ({ word: str(u.word, 60), sentence: str(u.sentence, 200), better: str(u.better, 200), tip: str(u.tip, 200), alt: str(u.alt, 200) }))
        .filter(u => u.word && u.sentence && u.better && u.sentence !== u.better).slice(0, 3);
      return json({ title: str(o.title, 40) || prompt.slice(0, 40), items: uniq.slice(0, DECK_SIZE), useit: useits[0] || null, useits });
    }
    if (b.action === "check") {
      if (limited(clientIp(req, ctx), "check")) return json({ error: "rate" }, 429);
      const sentence = str(b.sentence, 200), word = str(b.word, 60);
      if (!sentence || !word) return json({ error: "input" }, 400);
      const tname = targetName(b), uname = LANGS[lang(b.ui)] || nativeName(b);
      const r = await client.messages.parse({
        model: CHECK_MODEL,
        max_tokens: 800,
        output_config: { effort: "low", format: zodOutputFormat(CheckOut) },
        system: "You are a warm, encouraging language teacher. You check one sentence a learner wrote and fix it with as few changes as possible. You praise effort.",
        messages: [{ role: "user", content:
          `A ${tname} learner (level: ${LEVELS[b.level] || "unknown"}) practises the word "${word}"${str(b.meaning, 80) ? ` (= ${str(b.meaning, 80)})` : ""}. They wrote:\n${sentence}\n\n` +
          `verdict: "great" if it is a correct, understandable ${tname} sentence (small style choices are fine; be generous with beginners); "fixed" if it is a real attempt but has mistakes; "bad" only if it is not a sentence at all (one or two words, random letters), not in ${tname}, or nonsense.\n` +
          `better: for "great", the same sentence (or a slightly more natural version if a native speaker would clearly say it differently); for "fixed", their sentence with the fewest changes that make it correct and natural (keep their idea and words); for "bad", one short, simple ${tname} sentence with "${word}" at their level. No asterisks or quotes.\n` +
          `tip: one short, kind line in ${uname} (at most 14 words): for "fixed", what changed and why, in simple words; for "great", what they did well; for "bad", invite them to write a full sentence with the word. No grammar jargon.` }]
      });
      const o = r.parsed_output;
      if (!o) return json({ error: "empty" }, 502);
      const better = str(o.better, 240).replace(/\*/g, "");
      return json({ verdict: ["great", "fixed", "bad"].includes(o.verdict) ? o.verdict : "fixed", better: better || sentence, tip: str(o.tip, 200) });
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: "api", status: e.status }, 502);
    return json({ error: "failed" }, 500);
  }
};

export const config = { path: "/api/ai" };
