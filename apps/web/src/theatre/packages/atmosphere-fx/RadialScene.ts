import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, intensityGain, mid, rms } from "./audio";

/**
 * Max entity size as % of min(viewport w, h).
 * Treated as max diameter — circumference scales with this ceiling.
 */
export const RADIAL_MAX_CIRCUMFERENCE_PCT = 42;

const EDGE_POINTS = 72;
const SATELLITES = 5;

type Satellite = {
  angle: number;
  orbit: number;
  phase: number;
  size: number;
  hueShift: number;
};

/**
 * Living radial organism — amorphous center entity with morphing biological edge.
 * Bass = body pulse / lobe swell. Mid = undulation. High = membrane jitter.
 * Colors drift freely across the full hue range.
 */
export class AtmosphereRadialScene extends CanvasAnimation {
  private edge = new Float32Array(EDGE_POINTS);
  private edgeVel = new Float32Array(EDGE_POINTS);
  private pulse = 0.35;
  private pulseVel = 0;
  private hueA = 200;
  private hueB = 320;
  private hueC = 40;
  private satellites: Satellite[] = [];
  private lastElapsed = 0;
  private prevBass = 0;
  private prevMid = 0;
  private prevHigh = 0;

  private ensureSatellites() {
    if (this.satellites.length === SATELLITES) return;
    this.satellites = Array.from({ length: SATELLITES }, (_, i) => ({
      angle: (i / SATELLITES) * Math.PI * 2,
      orbit: 0.55 + (i % 3) * 0.12,
      phase: i * 1.7,
      size: 0.08 + (i % 3) * 0.03,
      hueShift: i * 47,
    }));
  }

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0, env(context));
    const r = Math.max(0, rms(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const punch = beatPunch(context);
    const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
    const t = context.shared.time.elapsed * 0.001;
    const delta = this.lastElapsed > 0
      ? Math.min(0.05, Math.max(0.008, t - this.lastElapsed))
      : 1 / 60;
    this.lastElapsed = t;
    this.ensureSatellites();

    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const minSide = Math.min(w, h);
    // Diameter ceiling → radius
    const maxR = (minSide * RADIAL_MAX_CIRCUMFERENCE_PCT) / 200;

    // Independent band edges
    const bassEdge = Math.max(0, b - this.prevBass);
    const midEdge = Math.max(0, m - this.prevMid);
    const highEdge = Math.max(0, hi - this.prevHigh);
    this.prevBass = b;
    this.prevMid = m;
    this.prevHigh = hi;

    // Free-ranging color drift (full hue circle, multiple channels)
    this.hueA = (this.hueA + delta * (8 + hi * 40 + m * 18) + bassEdge * 25) % 360;
    this.hueB = (this.hueB + delta * (12 + m * 35 + punch * 20) + midEdge * 30) % 360;
    this.hueC = (this.hueC + delta * (18 + b * 22 + highEdge * 50) + (triggers.beat ? 15 : 0)) % 360;
    if (triggers.chaosHit) {
      this.hueA = (this.hueA + 40 + Math.random() * 80) % 360;
      this.hueC = (this.hueC + 60 + Math.random() * 100) % 360;
    }

    // Core pulse — bass + intensity swell, springy
    const pulseGoal = Math.min(
      1,
      0.28 + e * 0.35 + b * 0.45 + r * 0.15 + (triggers.bassHit ? 0.35 : 0) + (triggers.beat ? 0.25 : 0) + punch * 0.12,
    );
    this.pulseVel += (pulseGoal - this.pulse) * 22 * delta;
    this.pulseVel *= Math.exp(-10 * delta);
    this.pulse = Math.max(0.12, Math.min(1.15, this.pulse + this.pulseVel * delta));
    if (bassEdge > 0.06 || triggers.bassHit) this.pulseVel += 2.8 + b * 3;

    const baseR = maxR * (0.35 + this.pulse * 0.55) * Math.min(1.25, Math.max(0.8, g));

    // Morphing membrane — each vertex driven independently
    for (let i = 0; i < EDGE_POINTS; i++) {
      const u = i / EDGE_POINTS;
      const ang = u * Math.PI * 2;
      // Bass: large slow lobes (2–4 around body)
      const lobe =
        Math.sin(ang * 2 + t * (0.7 + b * 1.2)) * b * 0.22
        + Math.sin(ang * 3 - t * 0.5) * b * 0.12;
      // Mid: medium biological undulation
      const undulate =
        Math.sin(ang * 5 + t * (1.8 + m * 3)) * m * 0.16
        + Math.sin(ang * 7 - t * 2.2 + m * 4) * m * 0.1;
      // High: fine membrane jitter / cilia
      const jitter =
        Math.sin(ang * 13 + t * (8 + hi * 14)) * hi * 0.08
        + Math.sin(ang * 21 - t * 11) * hi * 0.05;
      // Note hits poke local regions
      const notePoke =
        (triggers.bassHit ? Math.cos(ang * 2 + t) * 0.12 : 0)
        + (triggers.midsHit ? Math.sin(ang * 5 + t * 3) * 0.1 : 0)
        + (triggers.highsHit ? Math.sin(ang * 17 + t * 9) * 0.07 : 0)
        + (triggers.beat ? 0.06 : 0);

      const goal = lobe + undulate + jitter + notePoke + (bassEdge + midEdge + highEdge) * 0.15;
      const prev = this.edge[i]!;
      this.edgeVel[i]! += (goal - prev) * 28 * delta;
      this.edgeVel[i]! *= Math.exp(-12 * delta);
      this.edge[i] = prev + this.edgeVel[i]! * delta;
    }

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    // Soft aura
    const aura = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.85);
    aura.addColorStop(0, `hsla(${this.hueA}, 70%, 45%, ${(0.12 + e * 0.18 + punch * 0.1) * g})`);
    aura.addColorStop(0.45, `hsla(${this.hueB}, 65%, 35%, ${(0.08 + m * 0.12) * g})`);
    aura.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = aura;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, baseR * 1.85, 0, Math.PI * 2);
    this.ctx.fill();

    // Interconnected satellites (orbiting life)
    for (const sat of this.satellites) {
      sat.angle += delta * (0.35 + m * 0.8 + hi * 0.4 + (triggers.midsHit ? 1.2 : 0));
      const orbitR = baseR * (sat.orbit + b * 0.15 + Math.sin(t * 1.3 + sat.phase) * 0.08);
      const sx = cx + Math.cos(sat.angle + sat.phase * 0.2) * orbitR;
      const sy = cy + Math.sin(sat.angle + sat.phase * 0.2) * orbitR;
      const sr = baseR * sat.size * (0.7 + e * 0.5 + punch * 0.25) * g;
      const sh = (this.hueC + sat.hueShift) % 360;

      // Tendril to core
      this.ctx.strokeStyle = `hsla(${sh}, 70%, 55%, ${(0.1 + e * 0.15 + punch * 0.08) * g})`;
      this.ctx.lineWidth = 1 + e * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      const mx = (cx + sx) * 0.5 + Math.sin(t * 2 + sat.phase) * baseR * 0.12;
      const my = (cy + sy) * 0.5 + Math.cos(t * 1.7 + sat.phase) * baseR * 0.12;
      this.ctx.quadraticCurveTo(mx, my, sx, sy);
      this.ctx.stroke();

      const blob = this.ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2);
      blob.addColorStop(0, `hsla(${sh}, 85%, 65%, ${(0.35 + punch * 0.2) * g})`);
      blob.addColorStop(0.5, `hsla(${(sh + 40) % 360}, 70%, 45%, ${(0.15 + hi * 0.12) * g})`);
      blob.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = blob;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, sr * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Main amorphous body path
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < EDGE_POINTS; i++) {
      const ang = (i / EDGE_POINTS) * Math.PI * 2 - Math.PI * 0.5;
      const rr = Math.max(maxR * 0.08, Math.min(maxR, baseR * (1 + this.edge[i]!)));
      pts.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr });
    }

    // Filled organism body
    this.ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i]!;
      const p1 = pts[(i + 1) % pts.length]!;
      if (i === 0) this.ctx.moveTo(p0.x, p0.y);
      const mx = (p0.x + p1.x) * 0.5;
      const my = (p0.y + p1.y) * 0.5;
      this.ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
    }
    this.ctx.closePath();

    const body = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR);
    body.addColorStop(0, `hsla(${this.hueA}, 80%, 60%, ${(0.45 + punch * 0.25 + e * 0.15) * g})`);
    body.addColorStop(0.4, `hsla(${this.hueB}, 75%, 45%, ${(0.28 + m * 0.2) * g})`);
    body.addColorStop(0.75, `hsla(${this.hueC}, 70%, 35%, ${(0.16 + b * 0.15) * g})`);
    body.addColorStop(1, `hsla(${this.hueA}, 60%, 25%, 0)`);
    this.ctx.fillStyle = body;
    this.ctx.fill();

    // Membrane edge stroke — music-reactive outline
    this.ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i]!;
      const p1 = pts[(i + 1) % pts.length]!;
      if (i === 0) this.ctx.moveTo(p0.x, p0.y);
      this.ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) * 0.5, (p0.y + p1.y) * 0.5);
    }
    this.ctx.closePath();
    this.ctx.strokeStyle = `hsla(${this.hueC}, 90%, 70%, ${(0.35 + hi * 0.35 + punch * 0.25) * g})`;
    this.ctx.lineWidth = 1.5 + hi * 3 + punch * 2;
    this.ctx.stroke();
    this.ctx.strokeStyle = `hsla(${this.hueA}, 85%, 55%, ${(0.15 + b * 0.2) * g})`;
    this.ctx.lineWidth = 3 + b * 4;
    this.ctx.stroke();

    // Inner nucleus
    const nucR = baseR * (0.18 + e * 0.1 + (triggers.beat ? 0.08 : 0));
    const nuc = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, nucR * 2);
    nuc.addColorStop(0, `hsla(${this.hueB}, 95%, 75%, ${(0.55 + punch * 0.3) * g})`);
    nuc.addColorStop(0.45, `hsla(${this.hueA}, 80%, 50%, ${(0.25 + e * 0.2) * g})`);
    nuc.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = nuc;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, nucR * 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalCompositeOperation = "source-over";
  }
}
