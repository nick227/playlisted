import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, centroid, env, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type GridStyle = "gridTunnel" | "hexTunnel" | "radialSweep" | "crossFire" | "scanPlane";

const STYLES: GridStyle[] = ["gridTunnel", "hexTunnel", "radialSweep", "crossFire", "scanPlane"];

/** Tunnel depth reach — ring count and how far the vanishing point recedes. */
export const LASER_GRID_DEPTH_PCT = 70;

const TUNNEL_WORLD_R = 1;
const Z_NEAR = 0.55;
const FIXTURE_COUNT = 6;
const BEAM_WORLD_WIDTH = 0.05;

function createSeededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Proj = { sx: number; sy: number; scale: number };

/** Pinhole-camera perspective divide — the single source of all "depth" in this scene. */
function project(x: number, y: number, z: number, cx: number, cy: number, focal: number): Proj {
  const zc = Math.max(0.08, z);
  const s = focal / zc;
  return { sx: cx + x * s, sy: cy + y * s, scale: s };
}

function crossSectionVerts(sides: number, rot: number): Array<{ x: number; y: number }> {
  const verts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    verts.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  return verts;
}

/** Flat 2D polygon in screen space — used for the vanishing-point iris flare only. */
function polygonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

type Fixture = { phase: number; wobbleRate: number; wobbleAmt: number; radiusJitter: number };

type Ring = { z: number; depthNorm: number; points: Proj[] };

/**
 * A real pinhole-camera projection instead of a squashed-ellipse cheat: every
 * ring/rail/beam is a 3D point run through a single `project()` divide, so
 * perspective compression, vanishing-point convergence, and beam taper all
 * fall out of the math rather than being hand-tuned per shape. Six fixed
 * "rig" fixtures aim volumetric beams (tapered quad + core + haze) at a
 * wobbling 3D target rather than a flat fan of 2D lines. Depth fog desaturates
 * and dims distant geometry; a floor reflection, motion-echo on the nearest
 * ring, and a vanishing-point lens flare finish the shot.
 */
export class AtmosphereLaserGridScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private rng = createSeededRng((Math.random() * 1e9) | 0);
  private style: GridStyle = "gridTunnel";
  private holdSec = 0;
  private nextHold = 8;
  private lastT = 0;
  private tunnelPhase = 0;
  private momentum = 0;
  private beamAngle = this.rng() * Math.PI * 2;
  private beamDir = 1;
  private twistSeed = this.rng() * 1000;
  private fixtures: Fixture[] = Array.from({ length: FIXTURE_COUNT }, () => ({
    phase: this.rng() * Math.PI * 2,
    wobbleRate: 0.4 + this.rng() * 0.8,
    wobbleAmt: 0.18 + this.rng() * 0.4,
    radiusJitter: (this.rng() - 0.5) * 0.1,
  }));

  private restyle() {
    this.style = STYLES[Math.floor(this.rng() * STYLES.length)]!;
    this.nextHold = 6 + this.rng() * 9;
    this.twistSeed = this.rng() * 1000;
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
    if (this.holdSec >= this.nextHold || (triggers.chaosHit && this.rng() < 0.4)) {
      this.holdSec = 0;
      this.restyle();
    }

    if (triggers.bassHit || triggers.beat) {
      this.momentum = Math.min(2.2, this.momentum + 0.35 + punch * 0.3);
    }
    this.momentum *= Math.exp(-1.1 * delta);
    const pushSpeed = 0.12 + e * 0.22 + b * 0.18 + this.momentum * 0.4;
    this.tunnelPhase = (this.tunnelPhase + delta * pushSpeed) % 1;

    this.beamAngle += delta * this.beamDir * (0.6 + m * 2.4);
    if (this.style === "crossFire" && (triggers.beat || triggers.chaosHit)) {
      this.beamDir *= -1;
    }

    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.46;
    const focal = Math.min(w, h) * 0.62;
    const depthReach = LASER_GRID_DEPTH_PCT / 100;
    const zFar = 5 + depthReach * 15;
    const haze = 0.14 + e * 0.32;
    const hueDrift = cen * 100;

    this.ctx.clearRect(0, 0, w, h);

    // Atmospheric backdrop — a wash toward the vanishing point, thicker as env rises,
    // so the tunnel visibly fills with haze rather than staying a clean line drawing.
    this.ctx.globalCompositeOperation = "source-over";
    const backdrop = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
    backdrop.addColorStop(0, hsla(pal.a, tone.s * 0.6, tone.l * 0.4, (0.05 + haze * 0.18) * g));
    backdrop.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = backdrop;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.globalCompositeOperation = "lighter";

    const isRingStyle = this.style === "gridTunnel" || this.style === "hexTunnel" || this.style === "scanPlane";

    if (isRingStyle) {
      const sides = this.style === "hexTunnel" ? 6 : this.style === "scanPlane" ? 24 : 4;
      const ringCount = this.style === "scanPlane" ? 5 : 8 + Math.floor(depthReach * 6);
      const twistPerRing = this.style === "gridTunnel" ? 0.05 : this.style === "hexTunnel" ? 0.11 : 0;
      const spin = t * (0.06 + m * 0.14);

      const rings: Ring[] = [];
      for (let i = 0; i < ringCount; i++) {
        const depthNorm = (i / ringCount + this.tunnelPhase) % 1;
        const z = zFar - (zFar - Z_NEAR) * depthNorm;
        const rot = spin + i * twistPerRing + this.twistSeed * 0.0003;
        const verts = crossSectionVerts(sides, rot);
        const points = verts.map((v) => project(v.x * TUNNEL_WORLD_R, v.y * TUNNEL_WORLD_R, z, cx, cy, focal));
        rings.push({ z, depthNorm, points });
      }
      // Painter's order: far first so nearer rings/beams correctly overlap them.
      rings.sort((a, b2) => b2.z - a.z);

      const strokeRing = (ring: Ring, alphaMul: number, widthMul: number) => {
        const fog = Math.min(1, ring.z / zFar);
        const alpha = Math.pow(1 - fog, 1.3) * (0.22 + e * 0.16) * g * alphaMul;
        if (alpha < 0.008) return;
        const hue = pal.a + hueDrift * (1 - fog) + fog * 20;
        const sat = tone.s * (1 - fog * 0.45);
        const light = tone.l * (1 - fog * 0.5) + (1 - fog) * 14;
        this.ctx.beginPath();
        ring.points.forEach((p, i) => (i === 0 ? this.ctx.moveTo(p.sx, p.sy) : this.ctx.lineTo(p.sx, p.sy)));
        this.ctx.closePath();
        this.ctx.strokeStyle = hsla(hue, sat, light, alpha);
        this.ctx.lineWidth = Math.max(0.6, (1 + ring.points[0]!.scale * 1.4 + (triggers.beat ? 1.2 : 0)) * widthMul);
        this.ctx.stroke();
      };

      for (const ring of rings) {
        strokeRing(ring, 1, 1);
        // Motion-echo on the near end — a fading duplicate sells forward speed
        // proportional to accumulated bass-hit momentum, not just instantaneous level.
        if (ring.depthNorm > 0.82 && this.momentum > 0.15) {
          const echoScale = 1 + this.momentum * 0.05;
          this.ctx.save();
          this.ctx.translate(cx, cy);
          this.ctx.scale(echoScale, echoScale);
          this.ctx.translate(-cx, -cy);
          strokeRing(ring, Math.min(0.5, this.momentum * 0.3), 0.6);
          this.ctx.restore();
        }
      }

      // Rails — connect matching vertices of adjacent rings; the convergence
      // toward the vanishing point is a direct product of the projection, not drawn.
      for (let r = 0; r < rings.length - 1; r++) {
        const a = rings[r]!;
        const bRing = rings[r + 1]!;
        if (a.points.length !== bRing.points.length) continue;
        const fog = Math.min(1, ((a.z + bRing.z) * 0.5) / zFar);
        const alpha = Math.pow(1 - fog, 1.6) * (0.05 + hi * 0.08) * g;
        if (alpha < 0.006) continue;
        this.ctx.strokeStyle = hsla(pal.b + hueDrift * (1 - fog), tone.s * 0.7, tone.l, alpha);
        this.ctx.lineWidth = 1;
        for (let i = 0; i < a.points.length; i++) {
          this.ctx.beginPath();
          this.ctx.moveTo(a.points[i]!.sx, a.points[i]!.sy);
          this.ctx.lineTo(bRing.points[i]!.sx, bRing.points[i]!.sy);
          this.ctx.stroke();
        }
      }

      // Floor reflection — mirror about a near-bottom horizon so only the
      // rings' lowest, closest-to-camera arcs bounce back visibly, the way a
      // real reflective floor only catches what's near it, not the vanishing
      // point far above.
      const floorY = h * 0.88;
      this.ctx.save();
      this.ctx.globalAlpha = 0.18 + hi * 0.08;
      this.ctx.translate(cx, floorY);
      this.ctx.scale(1, -1);
      this.ctx.translate(-cx, -floorY);
      for (const ring of rings) strokeRing(ring, 0.6, 0.8);
      this.ctx.restore();
    }

    if (this.style === "scanPlane") {
      const scanZ = Z_NEAR + (Math.sin(this.tunnelPhase * Math.PI * 2) * 0.5 + 0.5) * (zFar - Z_NEAR);
      const p = project(0, 0, scanZ, cx, cy, focal);
      const discR = TUNNEL_WORLD_R * p.scale;
      const fog = Math.min(1, scanZ / zFar);
      const disc = this.ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, discR);
      disc.addColorStop(0, hsla(pal.accent + hueDrift, 95, tone.l + 25, (0.28 + hi * 0.3) * (1 - fog * 0.6) * g));
      disc.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = disc;
      this.ctx.fillRect(0, 0, w, h);
    }

    // Rig fixtures — volumetric beams from fixed 3D anchors to a wobbling 3D target,
    // so taper, brightness falloff, and beam width all come from the same projection.
    const activeFixtures = this.style === "radialSweep" ? this.fixtures : this.fixtures.slice(0, 4);
    const targetZ = Z_NEAR + (zFar - Z_NEAR) * 0.5;
    const crossFireBounce = this.style === "crossFire";

    activeFixtures.forEach((fx, i) => {
      const anchorAngle = (i / activeFixtures.length) * Math.PI * 2;
      const anchorR = TUNNEL_WORLD_R * (0.94 + fx.radiusJitter);
      const anchorZ = Z_NEAR * 1.3;
      const anchor = project(Math.cos(anchorAngle) * anchorR, Math.sin(anchorAngle) * anchorR, anchorZ, cx, cy, focal);

      const sweep = this.beamAngle + fx.phase + (crossFireBounce ? Math.PI * (i % 2) : 0);
      const wobble = Math.sin(t * fx.wobbleRate + fx.phase) * fx.wobbleAmt;
      const targetX = Math.cos(sweep) * TUNNEL_WORLD_R * 0.7;
      const targetY = Math.sin(sweep) * TUNNEL_WORLD_R * 0.7 + wobble * TUNNEL_WORLD_R * 0.6;
      const target = project(targetX, targetY, targetZ, cx, cy, focal);

      const dx = target.sx - anchor.sx;
      const dy = target.sy - anchor.sy;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / len;
      const ny = dx / len;
      const nearW = BEAM_WORLD_WIDTH * anchor.scale * (0.7 + hi * 0.6);
      const farW = BEAM_WORLD_WIDTH * target.scale * (0.7 + hi * 0.6);

      const grad = this.ctx.createLinearGradient(anchor.sx, anchor.sy, target.sx, target.sy);
      grad.addColorStop(0, hsla(pal.accent + hueDrift + i * 10, 95, tone.l + 28, (0.4 + punch * 0.3) * g));
      grad.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(anchor.sx + nx * nearW, anchor.sy + ny * nearW);
      this.ctx.lineTo(target.sx + nx * farW, target.sy + ny * farW);
      this.ctx.lineTo(target.sx - nx * farW, target.sy - ny * farW);
      this.ctx.lineTo(anchor.sx - nx * nearW, anchor.sy - ny * nearW);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = hsla(pal.accent + hueDrift + i * 10, 95, tone.l + 34, (0.55 + punch * 0.3) * g);
      this.ctx.lineWidth = Math.max(0.8, nearW * 0.5);
      this.ctx.beginPath();
      this.ctx.moveTo(anchor.sx, anchor.sy);
      this.ctx.lineTo(target.sx, target.sy);
      this.ctx.stroke();

      // Haze speckle along the beam — cheap volumetric scatter, shimmers with highs.
      const specks = 3;
      for (let s = 0; s < specks; s++) {
        const u = (s + 1) / (specks + 1);
        const jitter = (this.rng() - 0.5) * (1 - u) * nearW * 2;
        const sx = anchor.sx + dx * u + nx * jitter;
        const sy = anchor.sy + dy * u + ny * jitter;
        this.ctx.fillStyle = hsla(pal.accent, 90, 80, (0.08 + hi * 0.18) * g);
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, 1 + hi * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Chromatic snap on hard hits — a rare, deliberate fringe, not a full-frame effect.
      if (triggers.beat && i === 0) {
        this.ctx.strokeStyle = hsla(pal.a, 90, 60, 0.22 * g);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(anchor.sx + 2, anchor.sy);
        this.ctx.lineTo(target.sx + 2, target.sy);
        this.ctx.stroke();
        this.ctx.strokeStyle = hsla(pal.c, 90, 60, 0.2 * g);
        this.ctx.beginPath();
        this.ctx.moveTo(anchor.sx - 2, anchor.sy);
        this.ctx.lineTo(target.sx - 2, target.sy);
        this.ctx.stroke();
      }
    });

    // Vanishing-point lens flare — anamorphic streak + iris chain, warms on hits.
    const flareBoost = 0.5 + punch * 0.6 + (triggers.beat ? 0.3 : 0);
    const streak = this.ctx.createLinearGradient(cx - w * 0.4, cy, cx + w * 0.4, cy);
    streak.addColorStop(0, "hsla(0,0%,0%,0)");
    streak.addColorStop(0.5, hsla(pal.accent + hueDrift, 85, 85, 0.1 * flareBoost * g));
    streak.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = streak;
    this.ctx.fillRect(cx - w * 0.4, cy - 1.2, w * 0.8, 2.4);

    const irisSizes = [0.05, 0.1, 0.17, 0.26];
    irisSizes.forEach((frac, i) => {
      const rr = Math.min(w, h) * frac;
      polygonPath(this.ctx, cx, cy, rr, 6, t * 0.2 + i);
      this.ctx.fillStyle = hsla(pal.accent + hueDrift + i * 30, 90, 70, (0.05 + i * 0.01) * flareBoost * g);
      this.ctx.fill();
    });

    if (triggers.beat || punch > 0.55) {
      const flash = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.3);
      flash.addColorStop(0, hsla(pal.accent + hueDrift, 100, 80, (0.2 + punch * 0.22) * g));
      flash.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = flash;
      this.ctx.fillRect(0, 0, w, h);
    }

    this.ctx.globalCompositeOperation = "source-over";
  }
}
