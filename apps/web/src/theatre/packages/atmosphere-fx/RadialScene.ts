import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, hueFromAudio, intensityGain, mid, spectrumProxy } from "./audio";

type Ripple = { r: number; life: number; hue: number; width: number };

/** Cosmic pulse engine — spiral arms, shockwaves, starfield, spectrum ring. */
export class AtmosphereRadialScene extends CanvasAnimation {
  private ripples: Ripple[] = [];
  private lastPunch = 0;

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
    const cx = w * 0.5;
    const cy = h * 0.5;
    const hue = hueFromAudio(context, 220);
    const maxR = Math.hypot(w, h) * 0.55;

    if (punch > 0.5 && punch > this.lastPunch) {
      this.ripples.push({
        r: Math.min(w, h) * 0.08,
        life: 1,
        hue: (hue + punch * 40) % 360,
        width: 2 + punch * 6,
      });
      if (this.ripples.length > 8) this.ripples.shift();
    }
    this.lastPunch = punch;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    // Starfield dust
    const stars = 48;
    for (let i = 0; i < stars; i++) {
      const seed = i * 97.13;
      const ang = seed + t * (0.05 + (i % 5) * 0.01);
      const dist = ((seed * 13) % 1) * maxR * (0.3 + hi * 0.4);
      const sx = cx + Math.cos(ang) * dist;
      const sy = cy + Math.sin(ang) * dist;
      const a = (0.08 + ((seed * 7) % 1) * 0.2 + e * 0.15) * g;
      this.ctx.fillStyle = `hsla(${(hue + i * 7) % 360}, 90%, 80%, ${a})`;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 1 + ((seed * 3) % 1) * 2 + punch * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Spiral arms
    const arms = 4;
    for (let arm = 0; arm < arms; arm++) {
      this.ctx.beginPath();
      const base = (arm / arms) * Math.PI * 2 + t * (0.35 + b * 0.4);
      for (let i = 0; i < 60; i++) {
        const u = i / 59;
        const r = u * maxR * (0.15 + e * 0.55 + b * 0.2);
        const a = base + u * (2.8 + m);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.strokeStyle = `hsla(${(hue + arm * 40) % 360}, 90%, 65%, ${(0.12 + e * 0.2 + punch * 0.1) * g})`;
      this.ctx.lineWidth = 2 + e * 4 + punch * 3;
      this.ctx.stroke();
    }

    // Concentric energy rings
    for (let i = 0; i < 5; i++) {
      const r = Math.min(w, h) * (0.1 + i * 0.09) * (0.85 + e * 0.4 + b * 0.15) * g;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${(hue + i * 25) % 360}, 85%, 60%, ${(0.1 + (4 - i) * 0.04 + punch * 0.08) * g})`;
      this.ctx.lineWidth = 1.5 + (4 - i) * 0.6 + punch;
      this.ctx.stroke();
    }

    // Spectrum ring
    const ringR = Math.min(w, h) * (0.28 + e * 0.08);
    const bins = spectrumProxy(context, 64);
    this.ctx.beginPath();
    for (let i = 0; i < bins.length; i++) {
      const a = (i / bins.length) * Math.PI * 2 - Math.PI * 0.5;
      const rr = ringR + bins[i]! * Math.min(w, h) * 0.14 * g;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.strokeStyle = `hsla(${hue}, 95%, 70%, ${(0.35 + punch * 0.25) * g})`;
    this.ctx.lineWidth = 2 + punch * 2;
    this.ctx.stroke();

    // Shockwave ripples
    const next: Ripple[] = [];
    for (const ripple of this.ripples) {
      ripple.r += (maxR * 0.018) * (1 + e);
      ripple.life -= 0.018;
      if (ripple.life <= 0) continue;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, ripple.r, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${ripple.hue}, 90%, 70%, ${ripple.life * 0.45 * g})`;
      this.ctx.lineWidth = ripple.width * ripple.life;
      this.ctx.stroke();
      next.push(ripple);
    }
    this.ripples = next;

    // Core nova
    const coreR = Math.min(w, h) * (0.05 + e * 0.08 + punch * 0.06) * g;
    const core = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.2);
    core.addColorStop(0, `hsla(${hue}, 100%, 90%, ${(0.55 + punch * 0.3) * g})`);
    core.addColorStop(0.35, `hsla(${(hue + 40) % 360}, 90%, 60%, ${(0.25 + e * 0.2) * g})`);
    core.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = core;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, coreR * 2.2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalCompositeOperation = "source-over";
  }
}
