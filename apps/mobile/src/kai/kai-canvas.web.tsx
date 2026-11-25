import { Image } from 'expo-image';
import { View } from 'react-native';

import { KAI_VIEWBOX, stillEffects } from './step';

export type KaiCanvasProps = { state: string; playKey: number; progress?: number; still: boolean; width: number };

// Kai in a browser: a still picture per state. The live character is drawn with Skia on the phone; on the web that
// needs a large extra download (CanvasKit), so the web app shows the still poses from assets/kai.
const POSE: Record<string, number> = {
  idle: require('../../assets/kai/kai-idle.svg'),
  greeting: require('../../assets/kai/kai-greeting.svg'),
  listening: require('../../assets/kai/kai-listening.svg'),
  speaking: require('../../assets/kai/kai-speaking.svg'),
  thinking: require('../../assets/kai/kai-thinking.svg'),
  celebrate: require('../../assets/kai/kai-celebrate.svg'),
  wordUsed: require('../../assets/kai/kai-wordUsed.svg'),
};
// States with no still of their own show the nearest one.
const NEAREST: Record<string, keyof typeof POSE> = {
  making: 'thinking', searching: 'thinking', reading: 'thinking', scanning: 'thinking', waiting: 'idle', sleeping: 'idle', oops: 'idle', confused: 'idle',
  streak: 'celebrate', allDone: 'celebrate', levelUp: 'celebrate', deckDone: 'celebrate', milestone: 'celebrate', cheer: 'celebrate', proud: 'celebrate', yes: 'celebrate',
  curious: 'listening', audio: 'speaking', reviewing: 'idle',
};

export function KaiCanvas({ state, width }: KaiCanvasProps) {
  const [vx, vy, vw, vh] = KAI_VIEWBOX;
  const height = Math.round((width * vh) / vw);
  const source = POSE[state] ?? POSE[NEAREST[state] ?? 'idle'];
  const picture = <Image source={source} style={{ width, height }} contentFit="contain" />;
  // A state whose picture needs its effect (reviewing: the flashcards) gets it drawn over the still, from the same numbers as the phone.
  const extra = stillEffects(state);
  if (extra.length === 0) return picture;
  const u = Math.min(width / vw, height / vh);
  const ox = (width - u * vw) / 2 - vx * u, oy = (height - u * vh) / 2 - vy * u;
  return (
    <View style={{ width, height }}>
      {picture}
      {extra.map((r, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', left: ox + r.x * u, top: oy + r.y * u, width: r.w * u, height: r.h * u, borderRadius: r.r * u,
            backgroundColor: `rgb(${r.color.map(Math.round).join(',')})`, opacity: r.a,
          }}
        />
      ))}
    </View>
  );
}
