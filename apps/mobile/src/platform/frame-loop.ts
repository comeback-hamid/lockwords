// One animation loop for a canvas in the browser (live Kai, the meadow). The phone draws with Skia on the UI thread
// and never uses this.
type Loop = {
  draw(ms: number): void; // ms = the time this canvas has really been drawn, so a paused picture continues where it was
  isShown(): boolean; // false = on a screen under another screen, or not in the page
  raf(fn: (t: number) => void): number;
  caf(id: number): void;
};

// Starts drawing. Returns the function that stops it for good.
// A hidden browser tab stops the browser's own frames, so nothing runs there. A hidden screen keeps its frames but
// draws nothing, and its clock stands still.
export function startFrameLoop({ draw, isShown, raf, caf }: Loop): () => void {
  let id = 0;
  let stopped = false;
  let last = -1;
  let clock = 0;
  const frame = (t: number) => {
    if (stopped) return;
    if (isShown()) {
      if (last >= 0) clock += t - last;
      last = t;
      draw(clock);
    } else last = -1; // the time away does not count
    id = raf(frame);
  };
  id = raf(frame);
  return () => {
    stopped = true;
    caf(id);
  };
}

// The loop for a canvas element: shown = it takes room in the page (a screen under another one is `display: none`).
export function loopOnCanvas(canvas: HTMLCanvasElement, draw: (ms: number) => void): () => void {
  return startFrameLoop({ draw, isShown: () => canvas.offsetParent !== null, raf: (fn) => requestAnimationFrame(fn), caf: (id) => cancelAnimationFrame(id) });
}

// A canvas sized in real screen pixels, so squares stay sharp on a dense screen. Returns its drawing context, already
// scaled so the drawer works in CSS pixels.
export function sharpContext(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  const ratio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}
