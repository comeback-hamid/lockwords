# Code design

How features are built across the apps. Each change also has its own `design.md` inside `openspec/changes/<name>/`.
When a change is archived, copy any decision that matters for later features here.

## Decided so far
- **One codebase**: Expo (React Native) for iOS, Android and web. Widgets are native SwiftUI, added by a config plugin.
- **Server owns the rules**: SRS stages, due lists, free limits and every AI call live on the server. The app shows what the server says.
- **v1 is online**: review needs a connection. The widget shows the last words it got.
- **Kai**: one JSON spec (`apps/mobile/src/kai/character-spec.json`) → Skia on the phone, canvas on the web, still SVG poses on widgets.
- **Pictures**: made on the server, one file per card, saved in DigitalOcean Spaces, cached on the phone. The app copies today's pictures to the widget's folder.
- **Speak (after v1, not built now)**: the phone talks to the voice AI directly (WebRTC). The server gives a short-lived key and saves the transcript (text only).
- **Payments** behind one `premium.ts`; test store when there is no RevenueCat key. **Analytics** (PostHog): no key = off; mocked in tests.
