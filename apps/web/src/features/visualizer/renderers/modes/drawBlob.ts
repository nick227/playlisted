import type { VisualizerFrame } from "../../visualizerTypes";

function bassLevel(data: Uint8Array): number {
  const count = Math.max(1, Math.floor(data.length * 0.12));
  let total = 0;
  for (let index = 0; index < count; index += 1) total += data[index];
  return total / count / 255;
}

export function drawBlob(frame: VisualizerFrame): void {
  const { ctx, width, height, frequencyData, palette, settings, seed, time } = frame;
  const playing = frame.playbackState === "playing" || frame.playbackState === "loading";
  const motion =
    settings.motion === "off" ? 0 : settings.motion === "low" || !playing ? 0.2 : settings.motion === "high" ? 1.1 : 0.75;
  const bass = Math.max(0.12, bassLevel(frequencyData) * motion);
  const size = Math.min(width, height);
  const drift = time * 0.00008 * seed.drift * motion;
  const x = width * (0.5 + Math.sin(seed.rotationOffset + drift) * 0.18);
  const y = height * (0.48 + Math.cos(seed.rotationOffset * 0.7 + drift) * 0.14);
  const radius = size * (0.18 + bass * 0.24 * settings.intensity);
  const gradient = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);

  gradient.addColorStop(0, palette.accent);
  gradient.addColorStop(0.45, palette.base);
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.12 + settings.intensity * 0.18;
  ctx.filter = `blur(${Math.round(18 + settings.glow * 28)}px)`;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (palette.secondary) {
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = palette.secondary;
    ctx.beginPath();
    ctx.arc(width - x * 0.42, height - y * 0.3, radius * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
