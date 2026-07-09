import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, hueFromAudio, intensityGain, mid } from "./audio";

/** Volumetric aurora bloom — drifting light shafts, orbs, and edge corona. */
export class AtmosphereGlowScene extends CanvasAnimation {
  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.12, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const punch = beatPunch(context);
    const t = context.shared.time.elapsed * 0.001;
    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.48;
    const hue = hueFromAudio(context, 200);

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    // Deep stage wash
    const wash = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.85);
    wash.addColorStop(0, `hsla(${hue}, 80%, 55%, ${(0.18 + e * 0.35 + punch * 0.12) * g})`);
    wash.addColorStop(0.45, `hsla(${(hue + 50) % 360}, 70%, 40%, ${(0.1 + b * 0.2) * g})`);
    wash.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = wash;
    this.ctx.fillRect(0, 0, w, h);

    // Light shafts from below
    const shafts = 7;
    for (let i = 0; i < shafts; i++) {
      const a = -0.55 + (i / (shafts - 1)) * 1.1 + Math.sin(t * 0.6 + i) * 0.08;
      const len = h * (0.55 + e * 0.45 + b * 0.25);
      const x0 = cx + Math.sin(t * 0.3 + i) * w * 0.08;
      const y0 = h * 1.05;
      const x1 = x0 + Math.sin(a) * len;
      const y1 = y0 - Math.cos(a) * len;
      const shaft = this.ctx.createLinearGradient(x0, y0, x1, y1);
      const alpha = (0.04 + e * 0.1 + punch * 0.06) * g * (0.6 + (i % 2) * 0.4);
      shaft.addColorStop(0, `hsla(${(hue + i * 18) % 360}, 90%, 70%, ${alpha})`);
      shaft.addColorStop(1, "hsla(0,0%,100%,0)");
      this.ctx.strokeStyle = shaft;
      this.ctx.lineWidth = (18 + b * 40 + punch * 20) * g;
      this.ctx.beginPath();
      this.ctx.moveTo(x0, y0);
      this.ctx.lineTo(x1, y1);
      this.ctx.stroke();
    }

    // Floating orbs
    const orbs = 5;
    for (let i = 0; i < orbs; i++) {
      const ox = cx + Math.cos(t * (0.4 + i * 0.11) + i * 1.7) * w * (0.18 + m * 0.2);
      const oy = cy + Math.sin(t * (0.35 + i * 0.09) + i * 2.1) * h * (0.16 + hi * 0.18);
      const r = Math.min(w, h) * (0.06 + e * 0.08 + punch * 0.04) * (0.7 + (i % 3) * 0.2) * g;
      const orb = this.ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
      orb.addColorStop(0, `hsla(${(hue + i * 40) % 360}, 95%, 75%, ${(0.35 + punch * 0.2) * g})`);
      orb.addColorStop(0.4, `hsla(${(hue + i * 40 + 30) % 360}, 85%, 55%, ${(0.15 + e * 0.15) * g})`);
      orb.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = orb;
      this.ctx.beginPath();
      this.ctx.arc(ox, oy, r, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Edge corona
    const edge = this.ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.72);
    edge.addColorStop(0, "hsla(0,0%,0%,0)");
    edge.addColorStop(0.7, `hsla(${(hue + 20) % 360}, 90%, 60%, ${(0.05 + hi * 0.12) * g})`);
    edge.addColorStop(1, `hsla(${(hue + 80) % 360}, 100%, 70%, ${(0.12 + e * 0.2 + punch * 0.1) * g})`);
    this.ctx.fillStyle = edge;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.globalCompositeOperation = "source-over";
  }
}
