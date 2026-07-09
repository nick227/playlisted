import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, hueFromAudio, intensityGain, mid, spectrumProxy } from "./audio";

/** Stadium spectrum architecture — mirrored walls, floor reflection, peak flares. */
export class AtmosphereBarsScene extends CanvasAnimation {
  private peaks: number[] = [];

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.1, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const punch = beatPunch(context);
    const t = context.shared.time.elapsed * 0.001;
    const w = this.cssWidth;
    const h = this.cssHeight;
    const hue = hueFromAudio(context, 160);
    const count = Math.max(24, Math.floor(w / 28));
    const spectrum = spectrumProxy(context, count);

    if (this.peaks.length !== count) this.peaks = spectrum.map((v) => v);
    for (let i = 0; i < count; i++) {
      this.peaks[i] = Math.max(spectrum[i]!, (this.peaks[i] ?? 0) * (0.96 - punch * 0.02));
    }

    this.ctx.clearRect(0, 0, w, h);

    // Floor glow plane
    const floorY = h * 0.78;
    const floor = this.ctx.createLinearGradient(0, floorY, 0, h);
    floor.addColorStop(0, `hsla(${hue}, 70%, 40%, ${(0.08 + e * 0.15) * g})`);
    floor.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = floor;
    this.ctx.fillRect(0, floorY, w, h - floorY);

    const gap = w / count;
    const barW = gap * 0.62;
    const maxH = h * (0.42 + b * 0.18) * g;

    // Mirrored side walls
    this.drawWall(spectrum, true, hue, g);
    this.drawWall(spectrum, false, hue, g);

    // Main front bars + reflection
    for (let i = 0; i < count; i++) {
      const v = spectrum[i]!;
      const peak = this.peaks[i]!;
      const x = i * gap + (gap - barW) * 0.5;
      const bh = Math.max(4, v * maxH);
      const ph = Math.max(bh, peak * maxH);
      const barHue = (hue + i * (180 / count) + m * 40) % 360;

      const grad = this.ctx.createLinearGradient(x, floorY - bh, x, floorY);
      grad.addColorStop(0, `hsla(${barHue}, 95%, 75%, ${(0.55 + punch * 0.2) * g})`);
      grad.addColorStop(0.5, `hsla(${(barHue + 30) % 360}, 85%, 55%, ${(0.45 + e * 0.2) * g})`);
      grad.addColorStop(1, `hsla(${(barHue + 60) % 360}, 70%, 35%, ${(0.25 + b * 0.2) * g})`);
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(x, floorY - bh, barW, bh);

      // Peak cap
      this.ctx.fillStyle = `hsla(${barHue}, 100%, 85%, ${(0.5 + hi * 0.3) * g})`;
      this.ctx.fillRect(x, floorY - ph - 3, barW, 3);

      // Reflection
      const refl = this.ctx.createLinearGradient(x, floorY, x, floorY + bh * 0.45);
      refl.addColorStop(0, `hsla(${barHue}, 80%, 50%, ${(0.2 + e * 0.15) * g})`);
      refl.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = refl;
      this.ctx.fillRect(x, floorY, barW, bh * 0.45);
    }

    // Top horizon arc
    this.ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${(0.15 + punch * 0.2 + hi * 0.15) * g})`;
    this.ctx.lineWidth = 2 + punch * 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, h * 0.12);
    for (let i = 0; i < count; i++) {
      const x = (i + 0.5) * gap;
      const y = h * 0.12 - spectrum[i]! * h * 0.08 * g + Math.sin(t * 2 + i * 0.3) * 2;
      this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
  }

  private drawWall(spectrum: number[], left: boolean, hue: number, g: number) {
    const w = this.cssWidth;
    const h = this.cssHeight;
    const count = spectrum.length;
    const wallW = w * 0.14;
    for (let i = 0; i < Math.min(12, count); i++) {
      const v = spectrum[left ? i : count - 1 - i]!;
      const y = h * 0.15 + (i / 12) * h * 0.55;
      const bw = Math.max(3, v * wallW * g);
      const x = left ? 0 : w - bw;
      this.ctx.fillStyle = `hsla(${(hue + i * 12) % 360}, 80%, 55%, ${(0.12 + v * 0.25) * g})`;
      this.ctx.fillRect(x, y, bw, Math.max(2, h * 0.035));
    }
  }
}
