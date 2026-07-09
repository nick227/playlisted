import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type VignetteStyle = "iris" | "petals" | "tunnel" | "blinds" | "eclipse";

const STYLES: VignetteStyle[] = ["iris", "petals", "tunnel", "blinds", "eclipse"];

/**
 * Cinematic vignette — morphing moods + rotating crush styles:
 * iris, dark petals, tunnel rings, blinds, eclipse.
 */
export class AtmosphereVignetteScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private lastT = 0;
  private style: VignetteStyle = "iris";
  private holdSec = 0;
  private nextHold = 7;
  private spin = Math.random() * Math.PI * 2;

  private restyle() {
    this.style = STYLES[Math.floor(Math.random() * STYLES.length)]!;
    this.spin = Math.random() * Math.PI * 2;
    this.nextHold = 5 + Math.random() * 11;
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
    const cy = h * 0.5;
    const strength = Math.min(1, (0.5 + e * 0.35 + b * 0.28 + punch * 0.35) * g);

    this.ctx.clearRect(0, 0, w, h);

    // Chromatic rim
    const rimR = Math.max(w, h) * (0.56 - punch * 0.05);
    for (const [dx, dy, hue] of [
      [-7, 0, pal.a],
      [7, 0, pal.c],
      [0, 5, pal.accent],
    ] as const) {
      const rim = this.ctx.createRadialGradient(cx + dx, cy + dy, Math.min(w, h) * 0.2, cx, cy, rimR);
      rim.addColorStop(0, "rgba(0,0,0,0)");
      rim.addColorStop(0.72, "rgba(0,0,0,0)");
      rim.addColorStop(1, hsla(hue, tone.s + 10, tone.l, 0.14 * strength));
      this.ctx.fillStyle = rim;
      this.ctx.fillRect(0, 0, w, h);
    }

    if (this.style === "petals" || this.style === "eclipse") {
      const petals = this.style === "eclipse" ? 6 : 10;
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(this.spin + t * (0.12 + m * 0.1) + punch * 0.06);
      for (let i = 0; i < petals; i++) {
        this.ctx.save();
        this.ctx.rotate((i / petals) * Math.PI * 2);
        const petal = this.ctx.createLinearGradient(0, 0, 0, -Math.max(w, h) * 0.72);
        petal.addColorStop(0, "rgba(0,0,0,0)");
        petal.addColorStop(0.4, `rgba(0,0,0,${0.18 * strength})`);
        petal.addColorStop(1, `rgba(0,0,0,${0.82 * strength})`);
        this.ctx.fillStyle = petal;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        const spread = w * (0.1 + (i % 3) * 0.02);
        this.ctx.quadraticCurveTo(spread, -h * 0.22, 0, -Math.max(w, h) * 0.78);
        this.ctx.quadraticCurveTo(-spread, -h * 0.22, 0, 0);
        this.ctx.fill();
        this.ctx.restore();
      }
      this.ctx.restore();
    }

    if (this.style === "tunnel") {
      const rings = 5;
      for (let i = 0; i < rings; i++) {
        const u = i / rings;
        const rad = Math.min(w, h) * (0.2 + u * 0.55 - punch * 0.03);
        this.ctx.strokeStyle = `rgba(0,0,0,${(0.2 + u * 0.45) * strength})`;
        this.ctx.lineWidth = 14 + u * 28 + b * 10;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.strokeStyle = hsla(pal.b + i * 20, tone.s, tone.l, (0.06 + hi * 0.08) * strength);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    }

    if (this.style === "blinds") {
      const bars = 9;
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(this.spin + t * 0.08);
      for (let i = 0; i < bars; i++) {
        const y = -Math.max(w, h) * 0.55 + (i / (bars - 1)) * Math.max(w, h) * 1.1;
        const grad = this.ctx.createLinearGradient(-w, y, w, y);
        grad.addColorStop(0, `rgba(0,0,0,${0.75 * strength})`);
        grad.addColorStop(0.5, `rgba(0,0,0,${(0.25 + (i % 2) * 0.2) * strength})`);
        grad.addColorStop(1, `rgba(0,0,0,${0.75 * strength})`);
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(-w, y - 10 - b * 8, w * 2, 18 + e * 14);
      }
      this.ctx.restore();
    }

    // Primary iris
    const inner = Math.min(w, h) * (0.16 - punch * 0.04 - b * 0.03) * (this.style === "eclipse" ? 0.7 : 1);
    const outer = Math.max(w, h) * (0.8 - e * 0.06);
    const iris = this.ctx.createRadialGradient(cx, cy, Math.max(0, inner), cx, cy, outer);
    iris.addColorStop(0, "rgba(0,0,0,0)");
    iris.addColorStop(0.4, `rgba(0,0,0,${0.1 * strength})`);
    iris.addColorStop(0.72, `rgba(0,0,0,${0.48 * strength})`);
    iris.addColorStop(1, `rgba(0,0,0,${Math.min(0.96, 0.72 + strength * 0.22)})`);
    this.ctx.fillStyle = iris;
    this.ctx.fillRect(0, 0, w, h);

    // Corner light leaks
    for (const [lx, ly, lh] of [
      [0, 0, pal.a],
      [w, 0, pal.b],
      [0, h, pal.c],
      [w, h, pal.accent],
    ] as const) {
      const leak = this.ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.min(w, h) * (0.26 + m * 0.16 + punch * 0.1));
      leak.addColorStop(0, hsla(lh, tone.s + 5, tone.l + 5, (0.1 + hi * 0.16 + punch * 0.12) * g));
      leak.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = leak;
      this.ctx.fillRect(0, 0, w, h);
    }

    if (punch > 0.28 || triggers.beat) {
      this.ctx.strokeStyle = hsla(pal.accent, 95, 70, (0.22 + punch * 0.2) * g);
      this.ctx.lineWidth = 3 + punch * 10;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, Math.min(w, h) * (0.3 + punch * 0.08), 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }
}
