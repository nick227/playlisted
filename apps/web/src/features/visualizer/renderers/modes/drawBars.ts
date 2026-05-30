import type { VisualizerFrame } from "../../visualizerTypes";

function motionScale(frame: VisualizerFrame): number {
  if (frame.settings.motion === "off") return 0;
  if (frame.playbackState === "paused") return 0.18;
  if (frame.playbackState !== "playing" && frame.playbackState !== "loading") return 0.12;
  if (frame.settings.motion === "low") return 0.45;
  if (frame.settings.motion === "high") return 1.25;
  return 1;
}

export function drawBars(frame: VisualizerFrame): void {
  const { ctx, width, height, frequencyData, palette, settings, seed, time } = frame;
  const scale = motionScale(frame);
  const barCount = Math.max(24, Math.min(84, Math.floor(width / (16 * seed.barSpacing))));
  const gap = 3 + seed.barSpacing * 3;
  const barWidth = Math.max(3, width / barCount - gap);
  const baseline = height * 0.8;
  const maxHeight = height * 0.34 * settings.intensity;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 16 * settings.glow;

  for (let index = 0; index < barCount; index += 1) {
    const dataIndex = Math.floor((index / barCount) * frequencyData.length);
    const audioLevel = frequencyData[dataIndex] / 255;
    const idle = 0.14 + Math.sin(time * 0.0012 + index * 0.45 + seed.rotationOffset) * 0.06;
    const level = Math.max(idle, audioLevel * scale);
    const x = index * (barWidth + gap);
    const h = Math.max(8, level * maxHeight);
    const y = baseline - h;
    ctx.fillStyle = index % 3 === 0 ? palette.accent : palette.base;
    ctx.globalAlpha = 0.55 + (h / maxHeight) * 0.45;
    ctx.fillRect(x, y, barWidth, h);
  }

  ctx.restore();
}
