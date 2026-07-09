import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, centroid, env, fxAmountOr, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type SonarStyle = "ping" | "sonarSweep" | "targetLock" | "concentricBloom" | "doublePulse";

const STYLES: SonarStyle[] = ["ping", "sonarSweep", "targetLock", "concentricBloom", "doublePulse"];

/** Max ring radius as % of screen half-diagonal (100 ≈ rings reach the corners). */
export const SONAR_MAX_RADIUS_PCT = 85;

function createSeededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Ring = {
  ox: number;
  oy: number;
  radius: number;
  life: number;
  speed: number;
  thickness: number;
  hueSeed: number;
  wobble: number;
  wobbleFreq: number;
  echo: boolean;
};

/**
 * Rhythm-forward sonar — concentric shockwave rings ping outward on every
 * beat/bass hit. Centroid steers a slow hue rotation across the whole field;
 * a rotating radar sweep and crosshair lock-on ticks vary by style.
 */
export class AtmosphereSonarScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private rings: Ring[] = [];
  private rng = createSeededRng((Math.random() * 1e9) | 0);
  private style: SonarStyle = "ping";
  private holdSec = 0;
  private nextHold = 7;
  private sweepAngle = this.rng() * Math.PI * 2;
  private lastT = 0;
  private breathSec = 0;
  private nextBreath = 2.5;

  private restyle() {
    this.style = STYLES[Math.floor(this.rng() * STYLES.length)]!;
    this.nextHold = 6 + this.rng() * 9;
  }

  private spawnRing(cx: number, cy: number, strength: number, echo = false) {
    this.rings.push({
      ox: cx,
      oy: cy,
      radius: 0,
      life: 1,
      speed: 0.55 + strength * 0.9,
      thickness: 3 + this.rng() * 6 + strength * 10,
      hueSeed: (this.rng() - 0.5) * 40,
      wobble: this.rng() * 0.06,
      wobbleFreq: 5 + this.rng() * 7,
      echo,
    });
    if (this.rings.length > 40) this.rings.shift();
  }

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.05, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const cen = centroid(context);
    const punch = beatPunch(context);
    const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
    const t = context.shared.time.elapsed * 0.001;
    const delta = this.lastT > 0 ? Math.min(0.05, Math.max(0.008, t - this.lastT)) : 1 / 60;
    this.lastT = t;

    const pal = this.palette.tick(delta, punch);
    const tone = moodTone(pal.mood, hi);

    this.holdSec += delta;
    if (this.holdSec >= this.nextHold || (triggers.chaosHit && this.rng() < 0.5)) {
      this.holdSec = 0;
      this.restyle();
    }

    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.hypot(w, h) * 0.5 * (fxAmountOr(context, SONAR_MAX_RADIUS_PCT) / 100);

    // Ambient "breathing" ping so the field never sits fully still in quiet stretches.
    this.breathSec += delta;
    if (this.breathSec >= this.nextBreath) {
      this.breathSec = 0;
      this.nextBreath = 2 + this.rng() * 3;
      this.spawnRing(cx, cy, e * 0.4);
    }

    if (triggers.bassHit || triggers.beat) {
      const jx = this.style === "doublePulse" ? (this.rng() - 0.5) * w * 0.14 : 0;
      const jy = this.style === "doublePulse" ? (this.rng() - 0.5) * h * 0.14 : 0;
      this.spawnRing(cx + jx, cy + jy, 0.5 + b * 0.7 + punch * 0.6);
      if (this.style === "doublePulse") {
        this.spawnRing(cx - jx * 0.6, cy - jy * 0.6, 0.35 + punch * 0.4, true);
      }
    }
    if (triggers.chaosHit) {
      for (let i = 0; i < 3; i++) {
        const a = this.rng() * Math.PI * 2;
        const rr = this.rng() * Math.min(w, h) * 0.18;
        this.spawnRing(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.6 + this.rng() * 0.6);
      }
    }

    this.sweepAngle += delta * (0.5 + m * 1.8);

    // Advance rings
    const live: Ring[] = [];
    for (const ring of this.rings) {
      ring.radius += delta * maxR * ring.speed * (0.4 + e * 0.5);
      ring.life -= delta * (0.28 + ring.speed * 0.12);
      if (ring.life > 0 && ring.radius < maxR * 1.15) live.push(ring);
    }
    this.rings = live;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    // Faint scope backdrop
    const backdrop = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    backdrop.addColorStop(0, hsla(pal.a, tone.s, tone.l - 8, (0.05 + e * 0.06) * g));
    backdrop.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = backdrop;
    this.ctx.fillRect(0, 0, w, h);

    if (this.style === "sonarSweep") {
      const sweepLen = maxR;
      const grad = this.ctx.createConicGradient
        ? this.ctx.createConicGradient(this.sweepAngle - Math.PI * 0.22, cx, cy)
        : null;
      if (grad) {
        grad.addColorStop(0, "hsla(0,0%,0%,0)");
        grad.addColorStop(0.9, "hsla(0,0%,0%,0)");
        grad.addColorStop(1, hsla(pal.accent + cen * 120, 95, tone.l + 20, (0.16 + m * 0.2) * g));
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.arc(cx, cy, sweepLen, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.strokeStyle = hsla(pal.accent + cen * 120, 95, tone.l + 25, (0.35 + m * 0.3) * g);
      this.ctx.lineWidth = 2 + punch * 3;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(cx + Math.cos(this.sweepAngle) * sweepLen, cy + Math.sin(this.sweepAngle) * sweepLen);
      this.ctx.stroke();
    }

    for (const ring of this.rings) {
      const hue = pal.a + ring.hueSeed + cen * 130 + t * 6;
      const alpha = Math.max(0, ring.life) * (ring.echo ? 0.6 : 1) * g;
      const wobbleR = ring.radius * (1 + Math.sin(t * ring.wobbleFreq) * ring.wobble * (0.3 + hi));

      this.ctx.beginPath();
      this.ctx.arc(ring.ox, ring.oy, Math.max(1, wobbleR), 0, Math.PI * 2);
      this.ctx.strokeStyle = hsla(hue, tone.s + 10, tone.l + 15, alpha * 0.55);
      this.ctx.lineWidth = ring.thickness * (0.6 + ring.life * 0.4);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(ring.ox, ring.oy, Math.max(1, wobbleR), 0, Math.PI * 2);
      this.ctx.strokeStyle = hsla(pal.accent + ring.hueSeed, 95, tone.l + 30, alpha * 0.5);
      this.ctx.lineWidth = Math.max(1, ring.thickness * 0.25);
      this.ctx.stroke();

      if (this.style === "concentricBloom" && ring.life > 0.55) {
        const bloom = this.ctx.createRadialGradient(ring.ox, ring.oy, 0, ring.ox, ring.oy, wobbleR * 0.7);
        bloom.addColorStop(0, hsla(pal.accent + ring.hueSeed, 90, tone.l + 25, (ring.life - 0.55) * 0.4 * g));
        bloom.addColorStop(1, "hsla(0,0%,0%,0)");
        this.ctx.fillStyle = bloom;
        this.ctx.beginPath();
        this.ctx.arc(ring.ox, ring.oy, wobbleR * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
      }

      if (this.style === "targetLock") {
        const ticks = 8;
        for (let i = 0; i < ticks; i++) {
          const a = (i / ticks) * Math.PI * 2 + t * 0.15;
          const len = 10 + hi * 26 + punch * 10;
          const r0 = wobbleR + ring.thickness * 0.6;
          this.ctx.strokeStyle = hsla(pal.accent + i * 10, 95, tone.l + 20, alpha * 0.4);
          this.ctx.lineWidth = 2 + hi * 2;
          this.ctx.beginPath();
          this.ctx.moveTo(ring.ox + Math.cos(a) * r0, ring.oy + Math.sin(a) * r0);
          this.ctx.lineTo(ring.ox + Math.cos(a) * (r0 + len), ring.oy + Math.sin(a) * (r0 + len));
          this.ctx.stroke();
        }
      }
    }

    // Center pulse core on strong hits
    if (triggers.beat || punch > 0.5) {
      const core = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * (0.05 + punch * 0.06));
      core.addColorStop(0, hsla(pal.accent + cen * 90, 100, 75, (0.35 + punch * 0.4) * g));
      core.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = core;
      this.ctx.fillRect(0, 0, w, h);
    }

    this.ctx.globalCompositeOperation = "source-over";
  }
}
