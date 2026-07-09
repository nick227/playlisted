import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, hueFromAudio, intensityGain, mid } from "./audio";

/** Cinematic iris crush — rotating dark petals, chromatic rim, beat punch. */
export class AtmosphereVignetteScene extends CanvasAnimation {
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
    const hue = hueFromAudio(context, 280);
    const strength = Math.min(1, (0.55 + e * 0.35 + b * 0.25 + punch * 0.35) * g);

    this.ctx.clearRect(0, 0, w, h);

    // Soft chromatic rim (red/cyan offset)
    const rimR = Math.max(w, h) * (0.55 - punch * 0.04);
    for (const [dx, dy, col] of [
      [-6, 0, `hsla(0, 90%, 55%, ${0.12 * strength})`],
      [6, 0, `hsla(190, 90%, 55%, ${0.12 * strength})`],
      [0, 4, `hsla(${hue}, 80%, 50%, ${0.08 * strength})`],
    ] as const) {
      const rim = this.ctx.createRadialGradient(cx + dx, cy + dy, Math.min(w, h) * 0.22, cx, cy, rimR);
      rim.addColorStop(0, "rgba(0,0,0,0)");
      rim.addColorStop(0.75, "rgba(0,0,0,0)");
      rim.addColorStop(1, col);
      this.ctx.fillStyle = rim;
      this.ctx.fillRect(0, 0, w, h);
    }

    // Rotating dark petals
    const petals = 8;
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(t * 0.15 + punch * 0.08);
    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2;
      this.ctx.save();
      this.ctx.rotate(ang);
      const petal = this.ctx.createLinearGradient(0, 0, 0, -Math.max(w, h) * 0.7);
      petal.addColorStop(0, "rgba(0,0,0,0)");
      petal.addColorStop(0.45, `rgba(0,0,0,${0.15 * strength})`);
      petal.addColorStop(1, `rgba(0,0,0,${0.75 * strength})`);
      this.ctx.fillStyle = petal;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.quadraticCurveTo(w * 0.12, -h * 0.2, 0, -Math.max(w, h) * 0.75);
      this.ctx.quadraticCurveTo(-w * 0.12, -h * 0.2, 0, 0);
      this.ctx.fill();
      this.ctx.restore();
    }
    this.ctx.restore();

    // Primary iris
    const inner = Math.min(w, h) * (0.18 - punch * 0.04 - b * 0.03);
    const outer = Math.max(w, h) * (0.78 - e * 0.05);
    const iris = this.ctx.createRadialGradient(cx, cy, Math.max(0, inner), cx, cy, outer);
    iris.addColorStop(0, "rgba(0,0,0,0)");
    iris.addColorStop(0.45, `rgba(0,0,0,${0.12 * strength})`);
    iris.addColorStop(0.75, `rgba(0,0,0,${0.45 * strength})`);
    iris.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, 0.7 + strength * 0.25)})`);
    this.ctx.fillStyle = iris;
    this.ctx.fillRect(0, 0, w, h);

    // Corner light leaks
    const leaks = [
      [0, 0, hue],
      [w, 0, hue + 40],
      [0, h, hue + 80],
      [w, h, hue + 120],
    ] as const;
    for (const [lx, ly, lh] of leaks) {
      const leak = this.ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.min(w, h) * (0.28 + m * 0.15 + punch * 0.08));
      leak.addColorStop(0, `hsla(${lh % 360}, 85%, 55%, ${(0.1 + hi * 0.15 + punch * 0.1) * g})`);
      leak.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = leak;
      this.ctx.fillRect(0, 0, w, h);
    }

    // Beat flash ring
    if (punch > 0.3) {
      this.ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${0.25 * punch * g})`;
      this.ctx.lineWidth = 3 + punch * 8;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, Math.min(w, h) * (0.32 + punch * 0.06), 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }
}
