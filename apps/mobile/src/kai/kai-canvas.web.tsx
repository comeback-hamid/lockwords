import { Image } from 'expo-image';

import { KAI_VIEWBOX } from './step';

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
  curious: 'listening', audio: 'speaking',
};

export function KaiCanvas({ state, width }: KaiCanvasProps) {
  const [, , vw, vh] = KAI_VIEWBOX;
  const source = POSE[state] ?? POSE[NEAREST[state] ?? 'idle'];
  return <Image source={source} style={{ width, height: Math.round((width * vh) / vw) }} contentFit="contain" />;
}
