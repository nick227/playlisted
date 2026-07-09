import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, fxAmountOr, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type GlowStyle = "aurora" | "spot" | "shaft" | "ember" | "halo" | "amorphous";

const STYLES: GlowStyle[] = ["aurora", "spot", "shaft", "ember", "halo", "amorphous"];

export const GLOW_EFFECT_TUNING = 80; // 0-100 tuning constant for glow intensity

/**
 * Volumetric glow — morphing moods + rotating styles:
 * aurora curtains, spotlights, shafts, ember sparks, edge halo.
 */
export class AtmosphereGlowScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private lastT = 0;
  private style: GlowStyle = "amorphous";
  private holdSec = 0;
  private nextHold = 6;
  private styleSpin = Math.random() * Math.PI * 2;

  private restyle() {
    this.style = STYLES[Math.floor(Math.random() * STYLES.length)]!;
    this.styleSpin = Math.random() * Math.PI * 2;
    this.nextHold = 5 + Math.random() * 10;
  }

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.08, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const punch = beatPunch(context);
    const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
    const t = context.shared.time.elapsed * 0.001;
    const delta = this.lastT > 0 ? Math.min(0.05, Math.max(0.008, t - this.lastT)) : 1 / 60;
    this.lastT = t;

    const pal = this.palette.tick(delta, punch);
    const tone = moodTone(pal.mood, hi);
    this.holdSec += delta;
    if (this.holdSec >= this.nextHold || triggers.chaosHit) {
      this.holdSec = 0;
      this.restyle();
    }

    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.48;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    // Stage wash
    const wash = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.9);
    wash.addColorStop(0, hsla(pal.a, tone.s, tone.l + 8, (0.16 + e * 0.32 + punch * 0.12) * g));
    wash.addColorStop(0.4, hsla(pal.b, tone.s - 5, tone.l - 5, (0.1 + b * 0.22) * g));
    wash.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = wash;
    this.ctx.fillRect(0, 0, w, h);

    if (this.style === "shaft" || this.style === "aurora") {
      const shafts = this.style === "shaft" ? 9 : 6;
      for (let i = 0; i < shafts; i++) {
        const a = -0.65 + (i / Math.max(1, shafts - 1)) * 1.3 + Math.sin(t * 0.55 + i + this.styleSpin) * 0.1;
        const len = h * (0.5 + e * 0.5 + b * 0.3);
        const x0 = cx + Math.sin(t * 0.28 + i) * w * 0.1;
        const y0 = h * 1.06;
        const x1 = x0 + Math.sin(a) * len;
        const y1 = y0 - Math.cos(a) * len;
        const grad = this.ctx.createLinearGradient(x0, y0, x1, y1);
        const alpha = (0.05 + e * 0.12 + punch * 0.08) * g * (0.55 + (i % 2) * 0.45);
        grad.addColorStop(0, hsla(pal.a + i * 14, tone.s + 10, tone.l + 15, alpha));
        grad.addColorStop(1, "hsla(0,0%,100%,0)");
        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = (14 + b * 36 + punch * 22) * g * (this.style === "shaft" ? 1.15 : 0.9);
        this.ctx.lineCap = "round";
        this.ctx.beginPath();
        this.ctx.moveTo(x0, y0);
        this.ctx.lineTo(x1, y1);
        this.ctx.stroke();
      }
    }

    if (this.style === "spot" || this.style === "halo" || this.style === "ember") {
      const orbs = this.style === "ember" ? 8 : 5;
      for (let i = 0; i < orbs; i++) {
        const ox = cx + Math.cos(t * (0.35 + i * 0.1) + i * 1.7 + this.styleSpin) * w * (0.16 + m * 0.22);
        const oy = cy + Math.sin(t * (0.3 + i * 0.08) + i * 2.1) * h * (0.14 + hi * 0.2);
        const r = Math.min(w, h) * (0.05 + e * 0.09 + punch * 0.05) * (0.65 + (i % 3) * 0.25) * g;
        const orb = this.ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
        orb.addColorStop(0, hsla(pal.accent + i * 28, 95, tone.l + 20, (0.38 + punch * 0.22) * g));
        orb.addColorStop(0.45, hsla(pal.b + i * 20, tone.s, tone.l, (0.14 + e * 0.16) * g));
        orb.addColorStop(1, "hsla(0,0%,0%,0)");
        this.ctx.fillStyle = orb;
        this.ctx.beginPath();
        this.ctx.arc(ox, oy, r, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    if (this.style === "ember" && (hi > 0.12 || punch > 0.25)) {
      for (let i = 0; i < 28; i++) {
        const ang = this.styleSpin + i * 0.9 + t * (0.8 + hi);
        const rad = Math.min(w, h) * (0.1 + (i % 7) * 0.06 + punch * 0.08);
        const sx = cx + Math.cos(ang) * rad;
        const sy = cy + Math.sin(ang * 1.1) * rad * 0.7 + Math.sin(t + i) * 8;
        this.ctx.fillStyle = hsla(pal.accent + i * 8, 95, 70, (0.12 + hi * 0.2 + punch * 0.15) * g);
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, 1.5 + punch * 3 + (i % 3), 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    if (this.style === "amorphous") {
      const effectScale = Math.max(0, Math.min(100, fxAmountOr(context, GLOW_EFFECT_TUNING))) / 100;
      
      // Bass - Deep, intense, slow moving
      const bx = cx + Math.cos(t * 0.25 + this.styleSpin) * w * 0.35;
      const by = cy + Math.sin(t * 0.15 + this.styleSpin) * h * 0.35;
      const bRad = Math.max(w, h) * (0.3 + b * 0.3 * effectScale); // Smaller radius for distinction
      const bGlow = this.ctx.createRadialGradient(bx, by, 0, bx, by, bRad);
      bGlow.addColorStop(0, hsla(pal.a, tone.s + 20, tone.l + 10, (0.4 + b * 0.6) * g * effectScale)); // More intense core
      bGlow.addColorStop(0.3, hsla(pal.a, tone.s + 15, tone.l, (0.2 + b * 0.3) * g * effectScale)); // Sharp falloff
      bGlow.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = bGlow;
      this.ctx.fillRect(0, 0, w, h);
      
      // Mid - Medium size, slightly faster, distinct path
      const mx = cx + Math.sin(t * 0.4 - this.styleSpin * 1.5) * w * 0.4;
      const my = cy + Math.cos(t * 0.5 - this.styleSpin * 1.5) * h * 0.2;
      const mRad = Math.max(w, h) * (0.25 + m * 0.25 * effectScale);
      const mGlow = this.ctx.createRadialGradient(mx, my, 0, mx, my, mRad);
      mGlow.addColorStop(0, hsla(pal.b, tone.s + 25, tone.l + 15, (0.45 + m * 0.5) * g * effectScale));
      mGlow.addColorStop(0.3, hsla(pal.b, tone.s + 20, tone.l + 5, (0.25 + m * 0.3) * g * effectScale));
      mGlow.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = mGlow;
      this.ctx.fillRect(0, 0, w, h);
      
      // High - Smaller, faster, sharper
      const hx = cx + Math.cos(t * 0.6 + this.styleSpin * 2) * w * 0.2;
      const hy = cy + Math.sin(t * 0.7 + this.styleSpin * 2) * h * 0.4;
      const hRad = Math.max(w, h) * (0.15 + hi * 0.25 * effectScale);
      const hGlow = this.ctx.createRadialGradient(hx, hy, 0, hx, hy, hRad);
      hGlow.addColorStop(0, hsla(pal.c, tone.s + 30, tone.l + 25, (0.5 + hi * 0.7) * g * effectScale));
      hGlow.addColorStop(0.2, hsla(pal.c, tone.s + 20, tone.l + 10, (0.3 + hi * 0.4) * g * effectScale));
      hGlow.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = hGlow;
      this.ctx.fillRect(0, 0, w, h);

      // Envelope / Punch - Central dynamic glow, very intense on beat
      const envRad = Math.max(w, h) * (0.15 + (e + punch) * 0.3 * effectScale);
      const envGlow = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, envRad);
      envGlow.addColorStop(0, hsla(pal.accent, 100, tone.l + 35, (0.5 + e * 0.4 + punch * 0.8) * g * effectScale));
      envGlow.addColorStop(0.4, hsla(pal.accent, 95, tone.l + 15, (0.2 + e * 0.2 + punch * 0.4) * g * effectScale));
      envGlow.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = envGlow;
      this.ctx.fillRect(0, 0, w, h);
      
      // Ambient morphing background (darken slightly so intense glows stand out)
      const ambient = this.ctx.createLinearGradient(0, 0, w, h);
      ambient.addColorStop(0, hsla(pal.a, tone.s, tone.l - 20, (0.04 + e * 0.05) * g * effectScale));
      ambient.addColorStop(1, hsla(pal.accent, tone.s, tone.l - 20, (0.04 + e * 0.05) * g * effectScale));
      this.ctx.fillStyle = ambient;
      this.ctx.fillRect(0, 0, w, h);
    }

    // Edge corona always
    const edge = this.ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.22, cx, cy, Math.max(w, h) * 0.75);
    edge.addColorStop(0, "hsla(0,0%,0%,0)");
    edge.addColorStop(0.65, hsla(pal.b, tone.s, tone.l, (0.04 + hi * 0.1) * g));
    edge.addColorStop(1, hsla(pal.c, 95, tone.l + 12, (0.12 + e * 0.22 + punch * 0.12) * g));
    this.ctx.fillStyle = edge;
    this.ctx.fillRect(0, 0, w, h);

    if (triggers.beat || punch > 0.55) {
      const flash = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.35);
      flash.addColorStop(0, hsla(pal.accent, 100, 75, (0.18 + punch * 0.2) * g));
      flash.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = flash;
      this.ctx.fillRect(0, 0, w, h);
    }

    this.ctx.globalCompositeOperation = "source-over";
  }
}
