import { useCallback, useEffect, useState } from 'react';

import { api } from '@/auth/boot';
import { languageCode } from '@/new-words/chat';

// The translation switch of every Kai chat (onboarding, New words): one saved choice, one behavior.
// On: each Kai line that is not in the learner's own language shows that line in their language under a divider.
// `ownLanguage`: a chat that already knows the learner's language (onboarding) shows the switch at once and reads the
// saved choice by itself. A chat that loads it with its messages (New words) calls `start` instead.
export function useTranslation(ownLanguage?: string | null) {
  const [state, setState] = useState({ on: true, code: languageCode(ownLanguage ?? null) });
  const start = useCallback((on: boolean, nativeLanguage: string | null) => setState({ on, code: languageCode(nativeLanguage) }), []);

  const known = !!ownLanguage;
  useEffect(() => {
    if (!known) return;
    let live = true;
    // The saved choice (or the level's default). A failed read keeps translations on.
    Promise.resolve()
      .then(() => api.fetchKaiChat())
      .then(
        (chat) => live && setState((s) => ({ ...s, on: chat.translationOn })),
        () => {},
      );
    return () => {
      live = false;
    };
  }, [known]);

  const toggle = () => {
    const on = !state.on;
    setState((s) => ({ ...s, on }));
    Promise.resolve()
      .then(() => api.setKaiTranslation(on))
      .catch(() => setState((s) => ({ ...s, on: !on }))); // not saved: switch back
  };
  return { on: state.on, code: state.code, start, toggle };
}
