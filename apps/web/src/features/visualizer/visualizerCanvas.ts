export type VisualizerCanvasContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
};

export function bindVisualizerCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
): VisualizerCanvasContext | null {
  const nextDpr = Math.min(2, Math.max(1, dpr || 1));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  canvas.width = Math.max(1, Math.floor(width * nextDpr));
  canvas.height = Math.max(1, Math.floor(height * nextDpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
  return { ctx, width, height, dpr: nextDpr };
}
