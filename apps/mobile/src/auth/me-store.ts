import { useSyncExternalStore } from 'react';

import type { Me } from '@/api/client';

// Who the server says we are. Null until the first /v1/me answer.
let me: Me | null = null;
const listeners = new Set<() => void>();

export function setMe(next: Me | null) {
  me = next;
  listeners.forEach((l) => l());
}

export function useMe() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => me,
    () => me,
  );
}

export const getMe = () => me;
