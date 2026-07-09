import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, hueFromAudio, intensityGain, mid } from "./audio";

/** Liquid light theatre — flowing ribbons, prism bands, aurora curtains. */
export class AtmosphereColorWashScene extends CanvasAnimation {
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
    const hue = hueFromAudio(context, 30);

    this.ctx.clearRect(0, 0, w, h);

    // Base prism wash
    const base = this.ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, `hsla(${hue}, 75%, 45%, ${(0.16 + e * 0.22) * g})`);
    base.addColorStop(0.35, `hsla(${(hue + 70) % 360}, 80%, 50%, ${(0.12 + m * 0.2) * g})`);
    base.addColorStop(0.7, `hsla(${(hue + 160) % 360}, 70%, 42%, ${(0.1 + b * 0.18) * g})`);
    base.addColorStop(1, `hsla(${(hue + 240) % 360}, 85%, 48%, ${(0.14 + hi * 0.2) * g})`);
    this.ctx.fillStyle = base;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.globalCompositeOperation = "lighter";

    // Flowing ribbons
    const ribbons = 5;
    for (let r = 0; r < ribbons; r++) {
      const rh = (hue + r * 48) % 360;
      const yBase = h * (0.15 + r * 0.16);
      const amp = h * (0.06 + e * 0.1 + punch * 0.04);
      this.ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y =
          yBase
          + Math.sin(x * 0.008 + t * (0.8 + r * 0.15) + r) * amp
          + Math.sin(x * 0.02 + t * 1.4 + b * 3) * amp * 0.35;
        if (x === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.strokeStyle = `hsla(${rh}, 90%, 65%, ${(0.14 + e * 0.18 + punch * 0.1) * g})`;
      this.ctx.lineWidth = 10 + e * 28 + punch * 12;
      this.ctx.lineCap = "round";
      this.ctx.stroke();
    }

    // Vertical aurora curtains
    const curtains = 6;
    for (let i = 0; i < curtains; i++) {
      const x = ((i + 0.5) / curtains) * w + Math.sin(t * 0.5 + i) * w * 0.03;
      const curtain = this.ctx.createLinearGradient(x, 0, x, h);
      const ch = (hue + i * 35 + m * 50) % 360;
      curtain.addColorStop(0, `hsla(${ch}, 90%, 70%, 0)`);
      curtain.addColorStop(0.3, `hsla(${ch}, 85%, 60%, ${(0.08 + hi * 0.12) * g})`);
      curtain.addColorStop(0.6, `hsla(${(ch + 40) % 360}, 80%, 50%, ${(0.12 + e * 0.15 + punch * 0.08) * g})`);
      curtain.addColorStop(1, `hsla(${ch}, 70%, 40%, 0)`);
      this.ctx.fillStyle = curtain;
      this.ctx.fillRect(x - w * 0.04, 0, w * 0.08, h);
    }

    // Soft blobs drifting
    for (let i = 0; i < 4; i++) {
      const bx = w * (0.2 + i * 0.2) + Math.cos(t * 0.4 + i * 2) * w * 0.1;
      const by = h * (0.35 + Math.sin(t * 0.35 + i) * 0.2);
      const br = Math.min(w, h) * (0.12 + e * 0.1 + punch * 0.05) * g;
      const blob = this.ctx.createRadialGradient(bx, by, 0, bx, by, br);
      blob.addColorStop(0, `hsla(${(hue + i * 55) % 360}, 95%, 70%, ${(0.2 + punch * 0.15) * g})`);
      blob.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = blob;
      this.ctx.beginPath();
      this.ctx.arc(bx, by, br, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalCompositeOperation = "source-over";

    // Film grain shimmer on highs
    if (hi > 0.15 || punch > 0.2) {
      this.ctx.fillStyle = `hsla(0,0%,100%,${(0.02 + hi * 0.04 + punch * 0.03) * g})`;
      for (let i = 0; i < 40; i++) {
        const gx = ((i * 73 + t * 40) % w);
        const gy = ((i * 41 + t * 25) % h);
        this.ctx.fillRect(gx, gy, 2, 2);
      }
    }
  }
}
