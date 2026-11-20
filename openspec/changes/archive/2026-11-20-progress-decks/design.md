## Decisions
- **One deck page.** `src/app/deck/[id].tsx` is P3 and N7 at once (Hamid, P8). It is opened from the chat and from Your decks.
- **Filters are counted in the app** from the deck's cards (`stage`, `hard`, `known`): New = stage 0, Mastered = stage 5, Hard = hard, Known = known. "All" leaves known words out; they are under Known only. No server call per filter.
- **Restore** calls `POST /v1/cards/{id}/restore` and loads the deck again.
- **Review this deck** loads `GET /v1/review?deckId=`, puts the cards in the round store and opens the round screen. With no card it says "Nothing to review in this deck today."
- **Close on the round:** the full-screen round shows Close when it is not the very first round (the first one has none, Figma O12).
- **Every deck has the same icon** (the deck glyph). Figma shows an icon per topic; that needs a rule or the AI and is left out.
