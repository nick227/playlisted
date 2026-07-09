import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { barsSpectrum, bass, beatPunch, env, high, intensityGain, mid } from "./audio";
import { coolHueAt, hotHueAt, ShiftingBarsPalette } from "./barsPalette";

type Ripple = {
  origin: number;
  strength: number;
  radius: number;
  life: number;
};

/**
 * Magical spectral EQ — bottom-anchored giant bars.
 * Spring bounce + hit ripples. Silence ≈ floor; notes shoot the row.
 */
export class AtmosphereBarsScene extends CanvasAnimation {
  private height: number[] = [];
  private velocity: number[] = [];
  private peaks: number[] = [];
  private hitFlash: number[] = [];
  private ripples: Ripple[] = [];
  private palette = new ShiftingBarsPalette();
  private lastElapsedSec = 0;
  private prevBass = 0;
  private prevMid = 0;
  private prevHigh = 0;
  private prevPunch = 0;

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const punch = beatPunch(context);
    const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
    const elapsedSec = context.shared.time.elapsed * 0.001;
    const deltaSec = this.lastElapsedSec > 0
      ? Math.min(0.05, Math.max(0.008, elapsedSec - this.lastElapsedSec))
      : 1 / 60;
    this.lastElapsedSec = elapsedSec;
    const pal = this.palette.tick(deltaSec, punch);

    const w = this.cssWidth;
    const h = this.cssHeight;
    const floorY = h;
    // Tall travel — silence at bottom, hits near top of viewport
    const maxH = h * (0.88 + punch * 0.08) * Math.min(1.4, Math.max(0.85, g));
    const count = Math.max(32, Math.min(64, Math.floor(w / 16)));
    const target = barsSpectrum(context, count);

    if (this.height.length !== count) {
      this.height = target.map(() => 0);
      this.velocity = target.map(() => 0);
      this.peaks = target.map(() => 0);
      this.hitFlash = target.map(() => 0);
    }

    // Spawn ripples from band / beat edges
    const bassEdge = b - this.prevBass;
    const midEdge = m - this.prevMid;
    const highEdge = hi - this.prevHigh;
    this.prevBass = b;
    this.prevMid = m;
    this.prevHigh = hi;

    if ((triggers.bassHit || bassEdge > 0.08) && b > 0.12) {
      this.spawnRipple(0.08 + Math.min(0.2, b * 0.15), 0.7 + b * 0.9 + (triggers.bassHit ? 0.5 : 0));
    }
    if ((triggers.midsHit || midEdge > 0.08) && m > 0.12) {
      this.spawnRipple(0.45 + (Math.random() - 0.5) * 0.1, 0.55 + m * 0.8);
    }
    if ((triggers.highsHit || highEdge > 0.08) && hi > 0.1) {
      this.spawnRipple(0.88 - Math.min(0.15, hi * 0.1), 0.5 + hi * 0.75);
    }
    if (triggers.beat && punch >= this.prevPunch) {
      this.spawnRipple(0.2 + Math.random() * 0.15, 0.85 + punch * 0.4);
      this.spawnRipple(0.55, 0.55 + punch * 0.3);
    }
    if (triggers.chaosHit) {
      this.spawnRipple(Math.random(), 1.1);
    }
    this.prevPunch = punch;

    // Advance ripples
    const liveRipples: Ripple[] = [];
    for (const ripple of this.ripples) {
      ripple.radius += deltaSec * (2.8 + ripple.strength);
      ripple.life -= deltaSec * 1.35;
      if (ripple.life > 0) liveRipples.push(ripple);
    }
    this.ripples = liveRipples;

    // Spring physics toward audio target + ripple impulse
    const stiffness = 180;
    const damping = 14;
    for (let i = 0; i < count; i++) {
      const u = i / Math.max(1, count - 1);
      let goal = target[i]!;

      // Ripple boost across the row
      let rippleBoost = 0;
      for (const ripple of this.ripples) {
        const dist = Math.abs(u - ripple.origin);
        const wave = Math.exp(-((dist - ripple.radius) ** 2) / 0.012) * ripple.life * ripple.strength;
        const wake = Math.exp(-(dist ** 2) / 0.08) * ripple.life * ripple.strength * 0.25;
        rippleBoost += wave + wake;
      }
      goal = Math.min(1.7, goal + rippleBoost);

      // Near-silence floor: squash tiny noise to zero
      if (goal < 0.04 && punch < 0.2) goal = 0;

      const prev = this.height[i]!;
      const force = (goal - prev) * stiffness;
      this.velocity[i] = (this.velocity[i]! + force * deltaSec) * Math.exp(-damping * deltaSec);

      // Extra upward kick on rising edges so bars "shoot"
      const rising = goal - prev;
      if (rising > 0.15) {
        this.velocity[i]! += rising * 6.5;
        this.hitFlash[i] = Math.min(1, (this.hitFlash[i] ?? 0) + rising * 2.8);
      } else {
        this.hitFlash[i] = (this.hitFlash[i] ?? 0) * 0.82;
      }

      this.height[i] = Math.max(0, prev + this.velocity[i]! * deltaSec);
      // Soft ceiling with overshoot bounce
      if (this.height[i]! > 1.55) {
        this.height[i] = 1.55;
        this.velocity[i]! *= -0.35;
      }
      this.peaks[i] = Math.max(this.height[i]!, (this.peaks[i] ?? 0) * (0.94 - punch * 0.03));
      if (this.height[i]! < 0.01 && Math.abs(this.velocity[i]!) < 0.05) {
        this.height[i] = 0;
        this.velocity[i] = 0;
      }
    }

    this.ctx.clearRect(0, 0, w, h);

    const fog = this.ctx.createLinearGradient(0, h * 0.35, 0, h);
    fog.addColorStop(0, "hsla(0, 0%, 0%, 0)");
    fog.addColorStop(0.55, `hsla(${pal.fog}, 50%, 12%, ${(0.1 + e * 0.16) * g})`);
    fog.addColorStop(1, `hsla(${coolHueAt(pal, 0.3)}, 60%, 10%, ${(0.22 + b * 0.2) * g})`);
    this.ctx.fillStyle = fog;
    this.ctx.fillRect(0, 0, w, h);

    const gap = w / count;
    const barW = Math.max(4, gap * 0.72);

    this.ctx.globalCompositeOperation = "lighter";

    // Ghost trails of peaks
    for (let i = 0; i < count; i++) {
      const ghost = this.peaks[i]!;
      if (ghost < 0.02) continue;
      const x = i * gap + (gap - barW) * 0.5;
      const gh = ghost * maxH;
      const tNorm = i / Math.max(1, count - 1);
      const ghostGrad = this.ctx.createLinearGradient(x, floorY - gh, x, floorY);
      ghostGrad.addColorStop(0, `hsla(${coolHueAt(pal, tNorm)}, 90%, 70%, ${(0.05 + hi * 0.08) * g})`);
      ghostGrad.addColorStop(1, `hsla(${coolHueAt(pal, 1 - tNorm)}, 70%, 40%, ${(0.03 + e * 0.05) * g})`);
      this.ctx.fillStyle = ghostGrad;
      this.ctx.fillRect(x - 2, floorY - gh, barW + 4, gh);
    }

    for (let i = 0; i < count; i++) {
      const v = this.height[i]!;
      if (v < 0.008 && (this.hitFlash[i] ?? 0) < 0.05) continue;
      const peak = this.peaks[i]!;
      const flash = this.hitFlash[i] ?? 0;
      const x = i * gap + (gap - barW) * 0.5;
      const bh = Math.max(v > 0 ? 4 : 0, v * maxH);
      const ph = Math.max(bh, peak * maxH);
      const tNorm = i / Math.max(1, count - 1);

      const coolHue = coolHueAt(pal, tNorm);
      const hotHue = hotHueAt(pal, tNorm);
      const hit = Math.min(1, flash * 1.5 + (v > 0.4 ? (v - 0.4) * 1.8 : 0));
      const hue = coolHue + (((hotHue - coolHue + 540) % 360) - 180) * hit;
      const sat = 72 + hit * 28;
      const light = 40 + hit * 42 + punch * 10;

      if (hit > 0.2) {
        const bloom = this.ctx.createRadialGradient(
          x + barW * 0.5,
          floorY - bh * 0.7,
          0,
          x + barW * 0.5,
          floorY - bh * 0.5,
          bh * 0.6,
        );
        bloom.addColorStop(0, `hsla(${hotHue}, 100%, 70%, ${hit * 0.4 * g})`);
        bloom.addColorStop(1, "hsla(0,0%,0%,0)");
        this.ctx.fillStyle = bloom;
        this.ctx.fillRect(x - barW, floorY - bh - 24, barW * 3, bh + 48);
      }

      const grad = this.ctx.createLinearGradient(x, floorY - bh, x, floorY);
      grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(94, light + 20)}%, ${(0.8 + hit * 0.2) * g})`);
      grad.addColorStop(0.35, `hsla(${hue}, ${sat}%, ${light}%, ${(0.6 + hit * 0.3) * g})`);
      grad.addColorStop(0.75, `hsla(${coolHue}, 65%, 35%, ${(0.35 + e * 0.2) * g})`);
      grad.addColorStop(1, `hsla(${pal.fog}, 50%, 18%, ${(0.2 + b * 0.15) * g})`);
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(x, floorY - bh, barW, bh);

      if (hit > 0.18) {
        this.ctx.fillStyle = `hsla(${hotHue}, 100%, 88%, ${hit * 0.6 * g})`;
        this.ctx.fillRect(x + barW * 0.28, floorY - bh, barW * 0.44, bh);
      }

      const sparkY = floorY - ph;
      this.ctx.fillStyle = `hsla(${hit > 0.25 ? hotHue : coolHue}, 100%, ${75 + hit * 20}%, ${(0.55 + hit * 0.45) * g})`;
      this.ctx.fillRect(x - 1, sparkY - 4 - hit * 8, barW + 2, 3 + hit * 5);
      if (hit > 0.4) {
        this.ctx.fillStyle = `hsla(${pal.spark}, 100%, 90%, ${hit * 0.75 * g})`;
        this.ctx.fillRect(x + barW * 0.15, sparkY - 16 - punch * 10, barW * 0.7, 2);
      }

      const emberH = Math.min(bh, 48);
      if (emberH > 2) {
        const ember = this.ctx.createLinearGradient(x, floorY - emberH, x, floorY);
        ember.addColorStop(0, "hsla(0,0%,0%,0)");
        ember.addColorStop(1, `hsla(${hue}, 90%, 60%, ${(0.22 + hit * 0.35) * g})`);
        this.ctx.fillStyle = ember;
        this.ctx.fillRect(x, floorY - emberH, barW, emberH);
      }
    }

    // Spectral ribbon
    this.ctx.beginPath();
    let started = false;
    for (let i = 0; i < count; i++) {
      const x = (i + 0.5) * gap;
      const y = floorY - this.peaks[i]! * maxH - 8;
      if (!started) {
        this.ctx.moveTo(x, y);
        started = true;
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.strokeStyle = `hsla(${coolHueAt(pal, 0.2)}, 100%, 75%, ${(0.18 + punch * 0.3 + hi * 0.2) * g})`;
    this.ctx.lineWidth = 2 + punch * 4;
    this.ctx.stroke();
    this.ctx.strokeStyle = `hsla(${hotHueAt(pal, 0.8)}, 100%, 70%, ${(0.1 + punch * 0.25) * g})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    const contact = this.ctx.createLinearGradient(0, floorY - 8, 0, floorY);
    contact.addColorStop(0, "hsla(0,0%,0%,0)");
    contact.addColorStop(1, `hsla(${coolHueAt(pal, 0.5)}, 90%, 60%, ${(0.18 + e * 0.28 + punch * 0.25) * g})`);
    this.ctx.fillStyle = contact;
    this.ctx.fillRect(0, floorY - 10, w, 10);

    this.ctx.globalCompositeOperation = "source-over";
  }

  private spawnRipple(origin: number, strength: number) {
    this.ripples.push({
      origin: Math.max(0, Math.min(1, origin)),
      strength: Math.min(1.4, strength),
      radius: 0,
      life: 1,
    });
    if (this.ripples.length > 10) this.ripples.shift();
  }
}
