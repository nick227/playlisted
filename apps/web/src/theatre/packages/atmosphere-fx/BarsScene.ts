import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, intensityGain, mid, spectrumProxy } from "./audio";
import { coolHueAt, hotHueAt, ShiftingBarsPalette } from "./barsPalette";

/**
 * Magical spectral EQ — bottom-anchored giant bars.
 * Quiet = cool ghost field. Hits = hot flash. Palettes morph over time.
 */
export class AtmosphereBarsScene extends CanvasAnimation {
  private peaks: number[] = [];
  private smooth: number[] = [];
  private hitFlash: number[] = [];
  private palette = new ShiftingBarsPalette();
  private lastElapsedSec = 0;

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.08, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const punch = beatPunch(context);
    const elapsedSec = context.shared.time.elapsed * 0.001;
    const deltaSec = this.lastElapsedSec > 0
      ? Math.min(0.05, Math.max(0, elapsedSec - this.lastElapsedSec))
      : 1 / 60;
    this.lastElapsedSec = elapsedSec;
    const pal = this.palette.tick(deltaSec, punch);

    const w = this.cssWidth;
    const h = this.cssHeight;
    const floorY = h;
    const maxH = h * (0.72 + b * 0.12 + punch * 0.06) * Math.min(1.35, g);
    const count = Math.max(28, Math.min(56, Math.floor(w / 18)));
    const raw = spectrumProxy(context, count);

    if (this.peaks.length !== count) {
      this.peaks = raw.map((v) => v);
      this.smooth = raw.map((v) => v);
      this.hitFlash = raw.map(() => 0);
    }

    const spectrum = raw.map((v, i) => {
      const shaped = Math.pow(Math.min(1.25, v), 1.55) * (0.55 + e * 0.55);
      const bandBoost =
        i < count * 0.25 ? 1 + b * 0.55
        : i > count * 0.7 ? 1 + hi * 0.65
        : 1 + m * 0.35;
      return Math.min(1.35, shaped * bandBoost);
    });

    for (let i = 0; i < count; i++) {
      const target = spectrum[i]!;
      const prev = this.smooth[i] ?? 0;
      const attack = target > prev ? 0.55 : 0.12;
      this.smooth[i] = prev + (target - prev) * attack;
      this.peaks[i] = Math.max(this.smooth[i]!, (this.peaks[i] ?? 0) * (0.965 - punch * 0.02));
      const rising = target - prev;
      if (rising > 0.12 || (punch > 0.4 && target > 0.45)) {
        this.hitFlash[i] = Math.min(1, (this.hitFlash[i] ?? 0) + rising * 2.2 + punch * 0.25);
      } else {
        this.hitFlash[i] = (this.hitFlash[i] ?? 0) * 0.86;
      }
    }

    this.ctx.clearRect(0, 0, w, h);

    const fog = this.ctx.createLinearGradient(0, h * 0.35, 0, h);
    fog.addColorStop(0, "hsla(0, 0%, 0%, 0)");
    fog.addColorStop(0.55, `hsla(${pal.fog}, 50%, 12%, ${(0.12 + e * 0.18) * g})`);
    fog.addColorStop(1, `hsla(${coolHueAt(pal, 0.3)}, 60%, 10%, ${(0.28 + b * 0.2) * g})`);
    this.ctx.fillStyle = fog;
    this.ctx.fillRect(0, 0, w, h);

    const gap = w / count;
    const barW = Math.max(4, gap * 0.7);

    this.ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i++) {
      const ghost = this.peaks[i]!;
      const x = i * gap + (gap - barW) * 0.5;
      const gh = Math.max(2, ghost * maxH * 0.92);
      const tNorm = i / Math.max(1, count - 1);
      const ghostGrad = this.ctx.createLinearGradient(x, floorY - gh, x, floorY);
      ghostGrad.addColorStop(0, `hsla(${coolHueAt(pal, tNorm)}, 90%, 70%, ${(0.06 + hi * 0.08) * g})`);
      ghostGrad.addColorStop(1, `hsla(${coolHueAt(pal, 1 - tNorm)}, 70%, 40%, ${(0.04 + e * 0.06) * g})`);
      this.ctx.fillStyle = ghostGrad;
      this.ctx.fillRect(x - 2, floorY - gh, barW + 4, gh);
    }

    for (let i = 0; i < count; i++) {
      const v = this.smooth[i]!;
      const peak = this.peaks[i]!;
      const flash = this.hitFlash[i] ?? 0;
      const x = i * gap + (gap - barW) * 0.5;
      const bh = Math.max(6, v * maxH);
      const ph = Math.max(bh, peak * maxH);
      const tNorm = i / Math.max(1, count - 1);

      const coolHue = coolHueAt(pal, tNorm);
      const hotHue = hotHueAt(pal, tNorm);
      const hit = Math.min(1, flash * 1.4 + (v > 0.55 ? (v - 0.55) * 2 : 0));
      const hue = coolHue + (((hotHue - coolHue + 540) % 360) - 180) * hit;
      const sat = 70 + hit * 30;
      const light = 42 + hit * 38 + punch * 8;

      if (hit > 0.25) {
        const bloom = this.ctx.createRadialGradient(
          x + barW * 0.5,
          floorY - bh * 0.7,
          0,
          x + barW * 0.5,
          floorY - bh * 0.5,
          bh * 0.55,
        );
        bloom.addColorStop(0, `hsla(${hotHue}, 100%, 70%, ${hit * 0.35 * g})`);
        bloom.addColorStop(1, "hsla(0,0%,0%,0)");
        this.ctx.fillStyle = bloom;
        this.ctx.fillRect(x - barW, floorY - bh - 20, barW * 3, bh + 40);
      }

      const grad = this.ctx.createLinearGradient(x, floorY - bh, x, floorY);
      grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(92, light + 18)}%, ${(0.75 + hit * 0.25) * g})`);
      grad.addColorStop(0.35, `hsla(${hue}, ${sat}%, ${light}%, ${(0.55 + hit * 0.3) * g})`);
      grad.addColorStop(0.75, `hsla(${coolHue}, 65%, 35%, ${(0.35 + e * 0.2) * g})`);
      grad.addColorStop(1, `hsla(${pal.fog}, 50%, 18%, ${(0.2 + b * 0.15) * g})`);
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(x, floorY - bh, barW, bh);

      if (hit > 0.2) {
        this.ctx.fillStyle = `hsla(${hotHue}, 100%, 88%, ${hit * 0.55 * g})`;
        this.ctx.fillRect(x + barW * 0.28, floorY - bh, barW * 0.44, bh);
      }

      const sparkY = floorY - ph;
      this.ctx.fillStyle = `hsla(${hit > 0.3 ? hotHue : coolHue}, 100%, ${75 + hit * 20}%, ${(0.55 + hit * 0.45) * g})`;
      this.ctx.fillRect(x - 1, sparkY - 4 - hit * 6, barW + 2, 3 + hit * 4);
      if (hit > 0.45) {
        this.ctx.fillStyle = `hsla(${pal.spark}, 100%, 90%, ${hit * 0.7 * g})`;
        this.ctx.fillRect(x + barW * 0.15, sparkY - 14 - punch * 8, barW * 0.7, 2);
      }

      const ember = this.ctx.createLinearGradient(x, floorY - Math.min(bh, 40), x, floorY);
      ember.addColorStop(0, "hsla(0,0%,0%,0)");
      ember.addColorStop(1, `hsla(${hue}, 90%, 60%, ${(0.2 + hit * 0.35) * g})`);
      this.ctx.fillStyle = ember;
      this.ctx.fillRect(x, floorY - Math.min(bh, 40), barW, Math.min(bh, 40));
    }

    this.ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = (i + 0.5) * gap;
      const y = floorY - this.peaks[i]! * maxH - 10 - Math.sin(elapsedSec * 3 + i * 0.4) * 3;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.strokeStyle = `hsla(${coolHueAt(pal, 0.2)}, 100%, 75%, ${(0.2 + punch * 0.25 + hi * 0.2) * g})`;
    this.ctx.lineWidth = 2 + punch * 3;
    this.ctx.stroke();
    this.ctx.strokeStyle = `hsla(${hotHueAt(pal, 0.8)}, 100%, 70%, ${(0.12 + punch * 0.2) * g})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    const contact = this.ctx.createLinearGradient(0, floorY - 8, 0, floorY);
    contact.addColorStop(0, "hsla(0,0%,0%,0)");
    contact.addColorStop(1, `hsla(${coolHueAt(pal, 0.5)}, 90%, 60%, ${(0.2 + e * 0.25 + punch * 0.2) * g})`);
    this.ctx.fillStyle = contact;
    this.ctx.fillRect(0, floorY - 10, w, 10);

    this.ctx.globalCompositeOperation = "source-over";
  }
}
