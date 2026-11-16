import { useEffect, useState } from 'react';

// Loads once on mount (unless skip), with a retry. `load` must be stable (useCallback).
export function useLoad<T>(load: () => Promise<T>, skip = false) {
  const [state, setState] = useState<{ data: T | null; failed: boolean }>({ data: null, failed: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (skip) return;
    let live = true;
    load().then(
      (data) => live && setState({ data, failed: false }),
      () => live && setState({ data: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [load, skip, attempt]);
  const retry = () => {
    setState({ data: null, failed: false });
    setAttempt((a) => a + 1);
  };
  return { ...state, retry };
}
