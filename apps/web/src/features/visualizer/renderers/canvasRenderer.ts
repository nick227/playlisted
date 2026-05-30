import { drawBars } from "./modes/drawBars";
import { drawBlob } from "./modes/drawBlob";
import { drawRadial } from "./modes/drawRadial";
import { drawWave } from "./modes/drawWave";
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
      const { ctx } = frame;
      const opacity = frame.settings.backgroundOpacity * surfaceMultiplier(frame.surface);
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, frame.width, frame.height);
      ctx.fillStyle = frame.palette.background;
      ctx.globalAlpha = Math.min(0.9, Math.max(0, opacity));
      ctx.fillRect(0, 0, frame.width, frame.height);
      ctx.restore();

      if (frame.surface === "hidden") return;

      switch (frame.settings.mode) {
        case "radial-pulse":
          drawRadial(frame);
          break;
        case "soft-blob":
          drawBlob(frame);
          break;
        case "wave-ribbon":
          drawWave(frame);
          break;
        case "ambient-bars":
        default:
          drawBars(frame);
          break;
      }
    },
    destroy() {
      canvas = null;
      ctx = null;
    },
  };
}
