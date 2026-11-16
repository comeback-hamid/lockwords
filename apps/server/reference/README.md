# Reference code (not built, not run)

`lockwords-fn/` is the old Netlify function code from the marketing funnel (copied 2026-11-16 from `~/apps/lockwords-fn`).
It has working prompts and code for: deck ideas, decks, sentence checks, word-count estimate (Claude),
deck picture sheets (OpenAI Images) and pronunciation (OpenAI text-to-speech).

Port the parts you need into `src/` (as `src/llm/<task>.ts` modules) inside a feature change. Then delete what you ported from here.
