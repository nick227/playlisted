import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type WashStyle = "ribbons" | "curtains" | "tide" | "prism" | "smoke";

const STYLES: WashStyle[] = ["ribbons", "curtains", "tide", "prism", "smoke"];

/**
 * Liquid color wash — morphing moods + rotating flow styles:
 * ribbons, aurora curtains, tide waves, prism bands, smoke plumes.
 */
export class AtmosphereColorWashScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private lastT = 0;
  private style: WashStyle = "ribbons";
  private holdSec = 0;
  private nextHold = 6;
  private phase = Math.random() * Math.PI * 2;

  private restyle() {
    this.style = STYLES[Math.floor(Math.random() * STYLES.length)]!;
    this.phase = Math.random() * Math.PI * 2;
    this.nextHold = 4.5 + Math.random() * 10;
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

    this.ctx.clearRect(0, 0, w, h);

    // Base prism wash
    const base = this.ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, hsla(pal.a, tone.s, tone.l, (0.14 + e * 0.22) * g));
    base.addColorStop(0.35, hsla(pal.b, tone.s + 5, tone.l + 4, (0.12 + m * 0.2) * g));
    base.addColorStop(0.7, hsla(pal.c, tone.s - 5, tone.l - 4, (0.1 + b * 0.18) * g));
    base.addColorStop(1, hsla(pal.accent, tone.s + 8, tone.l + 2, (0.14 + hi * 0.2) * g));
    this.ctx.fillStyle = base;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.globalCompositeOperation = "lighter";

    if (this.style === "ribbons" || this.style === "tide") {
      const ribbons = this.style === "tide" ? 7 : 5;
      this.ctx.lineCap = "round";
      for (let r = 0; r < ribbons; r++) {
        const rh = pal.a + r * 42;
        const yBase = h * (0.12 + r * (0.75 / ribbons));
        const amp = h * (0.05 + e * 0.1 + punch * 0.05) * (this.style === "tide" ? 1.35 : 1);
        this.ctx.beginPath();
        for (let x = 0; x <= w; x += 10) {
          const y =
            yBase
            + Math.sin(x * 0.007 + t * (0.7 + r * 0.12) + this.phase + r) * amp
            + Math.sin(x * 0.018 + t * 1.3 + b * 3) * amp * 0.4;
          if (x === 0) this.ctx.moveTo(x, y);
          else this.ctx.lineTo(x, y);
        }
        this.ctx.strokeStyle = hsla(rh, tone.s + 10, tone.l + 12, (0.16 + e * 0.2 + punch * 0.12) * g);
        this.ctx.lineWidth = 12 + e * 30 + punch * 14 + (r % 2) * 6;
        this.ctx.stroke();
      }
    }

    if (this.style === "curtains" || this.style === "smoke") {
      const curtains = this.style === "smoke" ? 8 : 6;
      for (let i = 0; i < curtains; i++) {
        const x = ((i + 0.5) / curtains) * w + Math.sin(t * 0.45 + i + this.phase) * w * 0.04;
        const ch = pal.b + i * 28 + m * 40;
        const curtain = this.ctx.createLinearGradient(x, 0, x, h);
        curtain.addColorStop(0, hsla(ch, tone.s, tone.l + 15, 0));
        curtain.addColorStop(0.25, hsla(ch, tone.s, tone.l + 8, (0.08 + hi * 0.14) * g));
        curtain.addColorStop(0.55, hsla(ch + 35, tone.s, tone.l, (0.14 + e * 0.16 + punch * 0.1) * g));
        curtain.addColorStop(1, hsla(ch, tone.s - 10, tone.l - 8, 0));
        this.ctx.fillStyle = curtain;
        const width = w * (this.style === "smoke" ? 0.1 : 0.075) * (0.8 + Math.sin(t + i) * 0.2);
        this.ctx.fillRect(x - width * 0.5, 0, width, h);
      }
    }

    if (this.style === "prism") {
      const bands = 6;
      for (let i = 0; i < bands; i++) {
        const u = i / bands;
        const ang = this.phase + t * 0.15 + u * Math.PI * 0.3;
        const x0 = w * u + Math.sin(t + i) * 20;
        const grad = this.ctx.createLinearGradient(x0, 0, x0 + Math.cos(ang) * w * 0.4, h);
        const bh = pal.a + i * 48;
        grad.addColorStop(0, hsla(bh, tone.s, tone.l + 10, (0.06 + e * 0.1) * g));
        grad.addColorStop(0.5, hsla(bh + 40, tone.s + 5, tone.l, (0.16 + m * 0.15 + punch * 0.1) * g));
        grad.addColorStop(1, hsla(bh + 80, tone.s, tone.l - 5, 0));
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(x0 - w * 0.08, 0, w * 0.16, h);
      }
    }

    // Drifting blobs
    const blobs = this.style === "smoke" ? 6 : 4;
    for (let i = 0; i < blobs; i++) {
      const bx = w * (0.15 + i * (0.7 / Math.max(1, blobs - 1))) + Math.cos(t * 0.38 + i * 2 + this.phase) * w * 0.12;
      const by = h * (0.3 + Math.sin(t * 0.32 + i) * 0.22);
      const br = Math.min(w, h) * (0.1 + e * 0.1 + punch * 0.06) * g * (0.8 + (i % 3) * 0.15);
      const blob = this.ctx.createRadialGradient(bx, by, 0, bx, by, br);
      blob.addColorStop(0, hsla(pal.accent + i * 40, 95, tone.l + 15, (0.22 + punch * 0.18) * g));
      blob.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = blob;
      this.ctx.beginPath();
      this.ctx.arc(bx, by, br, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (triggers.beat || punch > 0.5) {
      const flash = this.ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.45);
      flash.addColorStop(0, hsla(pal.accent, 100, 70, (0.12 + punch * 0.18) * g));
      flash.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = flash;
      this.ctx.fillRect(0, 0, w, h);
    }

    this.ctx.globalCompositeOperation = "source-over";

    if (hi > 0.12 || punch > 0.2) {
      this.ctx.fillStyle = `hsla(0,0%,100%,${(0.02 + hi * 0.045 + punch * 0.03) * g})`;
      for (let i = 0; i < 36; i++) {
        this.ctx.fillRect((i * 73 + t * 50) % w, (i * 41 + t * 30) % h, 2, 2);
      }
    }
  }
}
