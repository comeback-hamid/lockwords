import { useEffect, useState } from 'react';

// Kai's hello plays, rests, and plays again by itself, so a learner who looks a moment later still sees the wave.
// The number is Kai's `playKey`; `wave()` plays it now (a tap on Kai). The motion itself runs on the UI thread.
const WAVE_EVERY_MS = 3500; // the greeting holds 2 s (character-spec.json), then a short rest

export function useWaves(): [number, () => void] {
  const [waves, setWaves] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWaves((n) => n + 1), WAVE_EVERY_MS);
    return () => clearInterval(t);
  }, []);
  return [waves, () => setWaves((n) => n + 1)];
}
