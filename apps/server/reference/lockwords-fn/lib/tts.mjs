// Pronunciation for funnel v3: GET /api/tts?l=<code>&t=<text>   (a typed language: n=<its name> instead of l)
//   -> audio/mpeg. Each (voice, language, text) is made once with OpenAI text-to-speech and kept in Netlify Blobs
//   "tts"; the browser and Netlify's CDN then cache it for a year. Needs OPENAI_API_KEY in the site env.
//   Only new clips count against the limits: 60 per IP per 10 minutes, TTS_DAILY_MAX a day (default 5,000; ~0.03 ¢ each).
// The handler is built by makeTts() so tests can pass an in-memory store and a mocked fetch (test/tts.test.mjs).
import { createHash } from "node:crypto";

export const STORE = "tts";
export const MODEL = "gpt-4o-mini-tts";
export const VOICE = "marin";
export const API = "https://api.openai.com/v1/audio/speech";
export const RATE = { max: 60, ms: 10 * 60 * 1000 };
export const MAX_CHARS = 80;
const LANGS = { en: "English", es: "Spanish", pt: "Brazilian Portuguese", it: "Italian", fr: "French", de: "German", tr: "Turkish", ru: "Russian", ar: "Arabic", ja: "Japanese", ko: "Korean", zh: "Mandarin Chinese", fa: "Persian (Farsi)" };

// Clean text: no control characters or *stars*, one line, at most MAX_CHARS
export const cleanText = v => (typeof v === "string" ? v.replace(/[\u0000-\u001f*]/g, " ").replace(/\s+/g, " ").trim() : "").slice(0, MAX_CHARS);
// Language: one of our codes, or a typed name (letters, spaces, hyphens, brackets; at most 30 characters)
export function langOf(code, name) {
  if (LANGS[code]) return LANGS[code];
  const n = typeof name === "string" ? name.trim().slice(0, 30) : "";
  return /^[\p{L}\p{M} ()-]+$/u.test(n) ? n : "";
}
export const keyOf = (lang, text) => createHash("sha256").update(`${MODEL}|${VOICE}|${lang}|${text}`).digest("hex").slice(0, 40) + ".mp3";
export const instructions = lang => `Speak ${lang} with a clear, natural native accent, calm and a little slow, for a language learner. Say exactly the text, nothing more.`;

const HEADERS = { "content-type": "audio/mpeg", "cache-control": "public, max-age=31536000, immutable", "netlify-cdn-cache-control": "public, max-age=31536000, durable" };
const err = (error, status) => new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const dayOf = t => new Date(t).toISOString().slice(0, 10).replace(/-/g, "");

export function makeTts({ getStore, fetch: fetchFn = fetch, env = process.env, now = () => Date.now() } = {}) {
  const hits = new Map(), days = new Map();
  const limited = ip => {
    const t = now(), a = (hits.get(ip) || []).filter(x => t - x < RATE.ms);
    if (a.length >= RATE.max) { hits.set(ip, a); return true; }
    a.push(t); hits.set(ip, a);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || t - v[v.length - 1] > RATE.ms) hits.delete(k);
    return false;
  };
  return async (req, ctx) => {
    if (req.method !== "GET") return err("method", 405);
    const q = new URL(req.url).searchParams, text = cleanText(q.get("t")), lang = langOf(q.get("l"), q.get("n"));
    if (!text || !lang) return err("input", 400);
    const store = getStore({ name: STORE }), key = keyOf(lang, text);
    try { const hit = await store.get(key, { type: "arrayBuffer" }); if (hit && hit.byteLength) return new Response(hit, { headers: HEADERS }); } catch (e) {}
    if (!env.OPENAI_API_KEY) return err("no_key", 503);
    const ip = (ctx && ctx.ip) || req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if (limited(ip)) return err("rate", 429);
    const day = dayOf(now()), max = Math.max(0, parseInt(env.TTS_DAILY_MAX || "5000", 10) || 0);
    if ((days.get(day) || 0) >= max) return err("daily", 429);
    days.set(day, (days.get(day) || 0) + 1); if (days.size > 3) days.delete(days.keys().next().value);
    let r;
    try {
      r = await fetchFn(API, { method: "POST", headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, instructions: instructions(lang), response_format: "mp3" }), signal: AbortSignal.timeout(15000) });
    } catch (e) { return err("failed", 502); }
    if (!r.ok) return err("api", r.status === 429 ? 429 : 502);
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.byteLength < 200) return err("empty", 502);
    try { await store.set(key, buf); } catch (e) {}
    return new Response(buf, { headers: HEADERS });
  };
}
