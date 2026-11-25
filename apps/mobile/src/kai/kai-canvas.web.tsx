import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { loopOnCanvas, sharpContext } from '@/platform/frame-loop';

import { drawKaiFrame } from './draw-2d';
import { createMemory, KAI_VIEWBOX, stepCharacter, stillEffects, type KaiInput, type KaiMemory } from './step';

export type KaiCanvasProps = { state: string; playKey: number; progress?: number; still: boolean; width: number };

// Kai in a browser. It moves as on the phone: the same step function (step.ts) gives every frame, and the browser's
// own 2D canvas draws it (draw-2d.ts). No Skia here: its web build is a 2.9 MB download before Kai could show.
// Reduce Motion (`still`): a still picture per state, from assets/kai.
export function KaiCanvas(props: KaiCanvasProps) {
  return props.still ? StillKai(props) : <LiveKai {...props} />;
}

function LiveKai({ state, playKey, progress, width }: KaiCanvasProps) {
  const [vx, vy, vw, vh] = KAI_VIEWBOX as [number, number, number, number];
  const height = Math.round((width * vh) / vw);
  const canvas = useRef<HTMLCanvasElement>(null);
  // Kai's memory lives as long as this canvas: a state change continues from the pose Kai is in.
  const memory = useRef<KaiMemory | null>(null);
  const input = useRef<KaiInput>({ state, playKey, progress: progress ?? -1, still: false });
  useEffect(() => {
    input.current = { state, playKey, progress: progress ?? -1, still: false };
  }, [state, playKey, progress]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = sharpContext(el, width, height);
    if (!ctx) return;
    // Whole pixels per unit, as on the phone, so Kai stays crisp.
    const u = Math.max(1, Math.floor(width / vw));
    const ox = Math.round((width - u * vw) / 2 - vx * u), oy = Math.round((height - u * vh) / 2 - vy * u);
    return loopOnCanvas(el, (ms) => {
      memory.current ??= createMemory();
      ctx.clearRect(0, 0, width, height);
      drawKaiFrame(ctx, stepCharacter(memory.current, input.current, ms), u, ox, oy);
    });
  }, [width, height, vx, vy, vw, vh]);

  return <canvas ref={canvas} data-testid="kai-live" style={{ width, height, display: 'block' }} />;
}

// The still poses (Reduce Motion).
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

function StillKai({ state, width }: KaiCanvasProps) {
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
