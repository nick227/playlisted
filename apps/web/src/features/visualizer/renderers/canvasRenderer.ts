import { drawBars } from "./modes/drawBars";
import type { VisualizerFrame, VisualizerRenderer } from "../visualizerTypes";

function surfaceMultiplier(surface: VisualizerFrame["surface"]): number {
  if (surface === "hidden") return 0;
  if (surface === "editor") return 0.35;
  if (surface === "soft") return 0.55;
  if (surface === "immersive") return 1.15;
  return 1;
}

export function createCanvasVisualizerRenderer(): VisualizerRenderer {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;

  return {
    mount(nextCanvas) {
      canvas = nextCanvas;
      ctx = canvas.getContext("2d");
    },
    resize(nextWidth, nextHeight, nextDpr) {
      if (!canvas) return;
      width = nextWidth;
      height = nextHeight;
      dpr = Math.min(2, Math.max(1, nextDpr || 1));
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    getContext() {
      return ctx;
    },
    render(frame) {
      if (!frame.ctx || frame.width <= 0 || frame.height <= 0) return;
      const opacity = frame.settings.backgroundOpacity * surfaceMultiplier(frame.surface);
      frame.ctx.save();
      frame.ctx.globalCompositeOperation = "source-over";
      frame.ctx.clearRect(0, 0, frame.width, frame.height);
      frame.ctx.fillStyle = frame.palette.background;
      frame.ctx.globalAlpha = Math.min(0.9, Math.max(0, opacity));
      frame.ctx.fillRect(0, 0, frame.width, frame.height);
      frame.ctx.restore();

      if (frame.surface !== "hidden") drawBars(frame);
    },
    destroy() {
      canvas = null;
      ctx = null;
    },
  };
}
