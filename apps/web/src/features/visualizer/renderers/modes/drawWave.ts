import type { VisualizerFrame } from "../../visualizerTypes";

export function drawWave(frame: VisualizerFrame): void {
  const { ctx, width, height, timeData, palette, settings, seed, time } = frame;
  const playing = frame.playbackState === "playing" || frame.playbackState === "loading";
  const motion =
    settings.motion === "off" ? 0 : settings.motion === "low" || !playing ? 0.22 : settings.motion === "high" ? 1.15 : 0.8;
  const centerY = height * (0.52 + Math.sin(time * 0.0001 * seed.drift) * 0.05 * motion);
  const amplitude = height * 0.18 * settings.intensity;
  const points = Math.min(180, timeData.length);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.006);
  ctx.strokeStyle = palette.base;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 18 * settings.glow;
  ctx.beginPath();

  for (let index = 0; index < points; index += 1) {
    const sample = (timeData[index] - 128) / 128;
    const idle = Math.sin(index * 0.12 * seed.curveDensity + time * 0.001 * seed.drift) * 0.18;
    const x = (index / (points - 1)) * width;
    const y = centerY + (sample * motion + idle * (1 - motion * 0.55)) * amplitude;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth *= 0.45;
  ctx.translate(0, height * 0.045);
  ctx.stroke();
  ctx.restore();
}
