# Lockwords

A minimal flashcard app for any language. Personal decks made by chatting with **Kai**, fast-swipe review (spaced repetition), your hard words on the lock screen, and **Use it**. v1 tabs: New words · Review · Progress (Speak comes after v1).

- Product (what is decided): [docs/product.md](docs/product.md)
- Screens + Figma links: [docs/screens.md](docs/screens.md) · Figma: https://www.figma.com/design/HSABWihDUDlsVz85aixHiT
- Roadmap: [docs/roadmap.md](docs/roadmap.md)
- How we build: [docs/dev-guide.html](docs/dev-guide.html) · Agent rules: [AGENTS.md](AGENTS.md)

## Start
```bash
npm install            # also turns on the git hooks (.githooks/)
npm run db:setup       # local databases lockwords_dev + lockwords_test
npm run dev:up         # needs Docker Desktop: local Supabase (login) + .env files + migrations + server on :8787
cd apps/mobile && npm run ios           # dev build on the iOS simulator
```

## Checks
```bash
npm test                 # unit + component tests (both apps)
npm run test:integration # server tests on lockwords_test
npm run typecheck && npm run lint
npm run e2e -- --areas review   # Maestro on the booted simulator
npm run spec:validate    # OpenSpec, strict
```

## Tools this repo expects
Node 22, Xcode + iOS simulator, Maestro, OpenSpec CLI (`npm i -g @fission-ai/openspec`), PostgreSQL, EAS CLI, gitleaks.

## Credits
Word test frequencies: FrequencyWords by Hermit Dave (CC BY-SA 4.0), from OpenSubtitles. Lemma data: simplemma (MIT). See `docs/vocab-engine.md`.
