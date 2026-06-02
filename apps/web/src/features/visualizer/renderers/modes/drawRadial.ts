import type { VisualizerFrame } from "../../visualizerTypes";

export function drawRadial(frame: VisualizerFrame): void {
  const { ctx, width, height, frequencyData, palette, settings, seed, time } = frame;
  const size = Math.min(width, height);
  const centerX = width * (0.5 + Math.sin(seed.rotationOffset) * 0.08);
  const centerY = height * (0.48 + Math.cos(seed.rotationOffset) * 0.08);
  const radius = size * (0.14 + seed.pulseSoftness * 0.08);
  const points = 96;
  const playing = frame.playbackState === "playing" || frame.playbackState === "loading";
  const motion =
    settings.motion === "off" ? 0 : settings.motion === "low" || !playing ? 0.25 : settings.motion === "high" ? 1.2 : 0.85;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(seed.rotationOffset + time * 0.00004 * seed.drift * motion);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = Math.max(1, size * 0.004);
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 24 * settings.glow;
  ctx.beginPath();

  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const dataIndex = Math.floor((index / points) * frequencyData.length * 0.72);
    const audioLevel = frequencyData[dataIndex] / 255;
    const idle = 0.1 + Math.sin(time * 0.001 + index * 0.2) * 0.04;
    const pulse = Math.max(idle, audioLevel * motion);
    const r = radius + pulse * size * 0.18 * settings.intensity;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 0.16 + seed.accentEmphasis * 0.12;
  ctx.fillStyle = palette.base;
  ctx.fill();
  ctx.restore();
}
