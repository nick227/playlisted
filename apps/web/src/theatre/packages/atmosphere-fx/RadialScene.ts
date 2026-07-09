import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, intensityGain, mid, rms } from "./audio";
import {
  buildShapePoints,
  createSeededRng,
  pickFxMode,
  pickShapeRecipe,
  type FxMode,
  type ShapeRecipe,
} from "./radialGeometry";

/** Max figure size as % of min(viewport w, h) — diameter ceiling. */
export const RADIAL_MAX_CIRCUMFERENCE_PCT = 55;

const EDGE = 96;

type Layer = {
  recipe: ShapeRecipe;
  scale: number;
  spin: number;
  spinVel: number;
  hue: number;
  role: "bass" | "mid" | "high" | "mix";
};

/**
 * Multi-shape laser / digital visualizer.
 * Procedural geometry generators + music-driven morph + random color FX.
 * Infinite permutations without hand-authored shapes.
 */
export class AtmosphereRadialScene extends CanvasAnimation {
  private layers: Layer[] = [];
  private warp = new Float32Array(EDGE);
  private warpVel = new Float32Array(EDGE);
  private rng = createSeededRng((Math.random() * 1e9) | 0);
  private fx: FxMode = "none";
  private fxLife = 0;
  private fxHue = 0;
  private scramble = 0;
  private lastElapsed = 0;
  private prevBass = 0;
  private prevMid = 0;
  private prevHigh = 0;
  private morph = 0;
  private holdSec = 0;
  private nextHold = 6;

  private reseedLayers(force = false) {
    if (!force && this.layers.length >= 3) return;
    const count = 3 + Math.floor(this.rng() * 3);
    const roles: Layer["role"][] = ["bass", "mid", "high", "mix", "mix"];
    this.layers = Array.from({ length: count }, (_, i) => ({
      recipe: pickShapeRecipe(this.rng),
      scale: 0.35 + i * 0.18 + this.rng() * 0.12,
      spin: this.rng() * Math.PI * 2,
      spinVel: (this.rng() - 0.5) * 0.8,
      hue: this.rng() * 360,
      role: roles[i % roles.length]!,
    }));
  }

  private triggerFx(strength: number) {
    this.fx = pickFxMode(this.rng);
    this.fxLife = 0.35 + strength * 0.7 + this.rng() * 0.4;
    this.fxHue = this.rng() * 360;
    if (this.fx === "scramble") this.scramble = 1;
    if (this.fx === "none" && this.rng() < 0.35) {
      // Occasional hard reshape on "none" roll during strong hits
      this.reseedLayers(true);
    }
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

    this.reseedLayers();

    const bassEdge = Math.max(0, b - this.prevBass);
    const midEdge = Math.max(0, m - this.prevMid);
    const highEdge = Math.max(0, hi - this.prevHigh);
    this.prevBass = b;
    this.prevMid = m;
    this.prevHigh = hi;

    // Reshape / FX on musical events
    this.holdSec += delta;
    if (this.holdSec >= this.nextHold || triggers.chaosHit) {
      this.holdSec = 0;
      this.nextHold = 4 + this.rng() * 9;
      if (this.rng() < 0.7) this.reseedLayers(true);
      else this.layers[Math.floor(this.rng() * this.layers.length)]!.recipe = pickShapeRecipe(this.rng);
    }
    if (triggers.bassHit || bassEdge > 0.1) this.triggerFx(0.6 + b);
    else if (triggers.highsHit || highEdge > 0.1) this.triggerFx(0.5 + hi);
    else if (triggers.beat && punch > 0.5) this.triggerFx(0.45 + punch * 0.3);
    else if (triggers.midsHit || midEdge > 0.1) this.triggerFx(0.4 + m);

    if (this.fxLife > 0) this.fxLife = Math.max(0, this.fxLife - delta);
    else this.fx = "none";
    this.scramble *= Math.exp(-3.5 * delta);
    this.morph += delta * (0.4 + e * 1.2 + m * 0.8);

    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = (Math.min(w, h) * RADIAL_MAX_CIRCUMFERENCE_PCT) / 200;

    // Per-vertex audio warp: bass lobes, mid undulation, high jitter — independent
    for (let i = 0; i < EDGE; i++) {
      const u = i / EDGE;
      const ang = u * Math.PI * 2;
      const bassW = Math.sin(ang * (2 + (this.layers[0]?.recipe.sides ?? 3) % 4) + t * (1 + b)) * b * 0.35;
      const midW = Math.sin(ang * 5 + t * (2 + m * 4)) * m * 0.28;
      const highW = Math.sin(ang * 17 + t * (9 + hi * 12)) * hi * 0.18;
      const note =
        (triggers.bassHit ? Math.cos(ang * 2) * 0.2 : 0)
        + (triggers.midsHit ? Math.sin(ang * 6) * 0.16 : 0)
        + (triggers.highsHit ? Math.sin(ang * 19) * 0.12 : 0)
        + (triggers.beat ? 0.1 : 0);
      const goal = bassW + midW + highW + note + (bassEdge + midEdge + highEdge) * 0.2;
      this.warpVel[i]! += (goal - this.warp[i]!) * 30 * delta;
      this.warpVel[i]! *= Math.exp(-14 * delta);
      this.warp[i] = this.warp[i]! + this.warpVel[i]! * delta;
    }

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    // Color wash FX backdrop
    if (this.fx === "wash" && this.fxLife > 0) {
      const wash = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 2.2);
      wash.addColorStop(0, `hsla(${this.fxHue}, 80%, 50%, ${this.fxLife * 0.35 * g})`);
      wash.addColorStop(0.5, `hsla(${(this.fxHue + 80) % 360}, 70%, 40%, ${this.fxLife * 0.18 * g})`);
      wash.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = wash;
      this.ctx.fillRect(0, 0, w, h);
    }

    // Draw nested procedural layers (laser / digital artist stack)
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li]!;
      const band =
        layer.role === "bass" ? b
        : layer.role === "mid" ? m
        : layer.role === "high" ? hi
        : (b + m + hi) / 3;

      layer.spinVel += (band - 0.2) * 0.8 * delta;
      layer.spinVel *= Math.exp(-2.5 * delta);
      layer.spin += (layer.spinVel + (layer.role === "high" ? hi * 1.5 : 0.2 + e * 0.5)) * delta;
      layer.hue = (layer.hue + delta * (10 + band * 50 + hi * 30) + (triggers.beat ? 8 : 0)) % 360;

      const pulse = 0.55 + band * 0.55 + e * 0.25 + (triggers.beat ? 0.12 : 0) + punch * 0.08;
      const scale = maxR * layer.scale * pulse * Math.min(1.3, Math.max(0.75, g));
      const scrambleOff = this.scramble > 0.05
        ? Math.sin(t * 17 + li * 5.1) * maxR * 0.12 * this.scramble
        : 0;

      // Rotate recipe twist live
      const liveRecipe: ShapeRecipe = {
        ...layer.recipe,
        twist: layer.recipe.twist + layer.spin,
      };

      const pts = buildShapePoints(liveRecipe, cx + scrambleOff, cy - scrambleOff * 0.4, scale, EDGE, this.morph + li, this.warp);

      // Inner pattern: spokes / grid chords
      const spokes = liveRecipe.spokes;
      this.ctx.strokeStyle = `hsla(${layer.hue}, 75%, 55%, ${(0.08 + band * 0.2 + punch * 0.1) * g})`;
      this.ctx.lineWidth = 1;
      for (let s = 0; s < spokes; s++) {
        const a = (s / spokes) * Math.PI * 2 + layer.spin;
        const rr = scale * (0.2 + band * 0.5);
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        this.ctx.stroke();
      }

      // Nested echoes
      for (let nest = liveRecipe.nest; nest >= 1; nest--) {
        const nestScale = nest / liveRecipe.nest;
        this.ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]!;
          const x = cx + (p.x - cx) * nestScale;
          const y = cy + (p.y - cy) * nestScale;
          if (i === 0) this.ctx.moveTo(x, y);
          else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        const alpha = (0.1 + band * 0.25 + (nest === liveRecipe.nest ? 0.15 : 0)) * g;
        this.ctx.strokeStyle = `hsla(${(layer.hue + nest * 25) % 360}, 85%, ${45 + band * 30}%, ${alpha})`;
        this.ctx.lineWidth = (nest === liveRecipe.nest ? 2.2 : 1) + band * 2 + punch;
        this.ctx.stroke();
        if (nest === liveRecipe.nest) {
          this.ctx.fillStyle = `hsla(${layer.hue}, 70%, 40%, ${(0.06 + e * 0.1 + punch * 0.08) * g})`;
          this.ctx.fill();
        }
      }

      // Color pop FX — flash vertices
      if (this.fx === "pop" && this.fxLife > 0) {
        for (let i = 0; i < pts.length; i += 3) {
          const p = pts[i]!;
          this.ctx.fillStyle = `hsla(${(this.fxHue + i * 9) % 360}, 100%, 70%, ${this.fxLife * 0.55 * g})`;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, 2 + punch * 3 + hi * 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    // Scramble FX — chaotic secondary polygons (time-seeded, stable within a frame)
    if (this.scramble > 0.05) {
      for (let k = 0; k < 4; k++) {
        const seedRng = createSeededRng(((t * 100) | 0) * 997 + k * 131 + (this.fxHue | 0));
        const recipe = pickShapeRecipe(seedRng);
        const sc = maxR * (0.2 + seedRng() * 0.5) * this.scramble;
        const pts = buildShapePoints(recipe, cx, cy, sc, 48, this.morph * 2 + k, this.warp);
        this.ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) this.ctx.moveTo(pts[i]!.x, pts[i]!.y);
          else this.ctx.lineTo(pts[i]!.x, pts[i]!.y);
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = `hsla(${(this.fxHue + k * 70) % 360}, 90%, 60%, ${this.scramble * 0.35 * g})`;
        this.ctx.lineWidth = 1 + this.scramble * 2;
        this.ctx.stroke();
      }
    }

    // Core laser node
    const coreR = maxR * (0.06 + e * 0.08 + r * 0.05 + (triggers.beat ? 0.05 : 0));
    const core = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 3);
    core.addColorStop(0, `hsla(${this.layers[0]?.hue ?? 0}, 100%, 80%, ${(0.5 + punch * 0.35) * g})`);
    core.addColorStop(0.4, `hsla(${this.layers[1]?.hue ?? 120}, 85%, 50%, ${(0.2 + e * 0.2) * g})`);
    core.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = core;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, coreR * 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalCompositeOperation = "source-over";
  }
}
