import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, high, intensityGain, mid, rms } from "./audio";
import {
  createSeededRng,
  drawFractalPattern,
  pickFxMode,
  pickFractalRecipe,
  type FractalRecipe,
  type FxMode,
} from "./radialGeometry";

/**
 * Max pattern size as % of screen coverage from center.
 * 100 = radius reaches viewport corners (full-screen).
 */
export const RADIAL_MAX_CIRCUMFERENCE_PCT = 100;

type Layer = {
  recipe: FractalRecipe;
  role: "bass" | "mid" | "high" | "mix";
  hueDrift: number;
};

/**
 * Fractal multi-shape field — infinite randomized patterns.
 * Size: RADIAL_MAX_CIRCUMFERENCE_PCT (100 = entire screen).
 */
export class AtmosphereRadialScene extends CanvasAnimation {
  private layers: Layer[] = [];
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
  private nextHold = 5;

  private reseed(force = false) {
    if (!force && this.layers.length >= 2) return;
    const count = 2 + Math.floor(this.rng() * 3);
    const roles: Layer["role"][] = ["bass", "mid", "high", "mix"];
    this.layers = Array.from({ length: count }, (_, i) => ({
      recipe: pickFractalRecipe(this.rng),
      role: roles[i % roles.length]!,
      hueDrift: this.rng() * 360,
    }));
  }

  private triggerFx(strength: number) {
    this.fx = pickFxMode(this.rng);
    this.fxLife = 0.4 + strength * 0.7 + this.rng() * 0.35;
    this.fxHue = this.rng() * 360;
    if (this.fx === "scramble") this.scramble = 1;
    if (this.fx === "none" && this.rng() < 0.4) this.reseed(true);
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

    this.reseed();

    const bassEdge = Math.max(0, b - this.prevBass);
    const midEdge = Math.max(0, m - this.prevMid);
    const highEdge = Math.max(0, hi - this.prevHigh);
    this.prevBass = b;
    this.prevMid = m;
    this.prevHigh = hi;

    this.holdSec += delta;
    if (this.holdSec >= this.nextHold || triggers.chaosHit) {
      this.holdSec = 0;
      this.nextHold = 3.5 + this.rng() * 8;
      if (this.rng() < 0.75) this.reseed(true);
      else if (this.layers.length) {
        const i = Math.floor(this.rng() * this.layers.length);
        this.layers[i]!.recipe = pickFractalRecipe(this.rng);
      }
    }

    if (triggers.bassHit || bassEdge > 0.1) this.triggerFx(0.65 + b);
    else if (triggers.highsHit || highEdge > 0.1) this.triggerFx(0.55 + hi);
    else if (triggers.beat && punch > 0.5) this.triggerFx(0.5 + punch * 0.3);
    else if (triggers.midsHit || midEdge > 0.1) this.triggerFx(0.45 + m);

    if (this.fxLife > 0) this.fxLife = Math.max(0, this.fxLife - delta);
    else this.fx = "none";
    this.scramble *= Math.exp(-3.2 * delta);
    this.morph += delta * (0.35 + e + m * 0.8);

    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    // 100 = half-diagonal radius → pattern reaches all corners (full screen)
    const maxR = (Math.hypot(w, h) * 0.5 * RADIAL_MAX_CIRCUMFERENCE_PCT) / 100
      * Math.min(1.25, Math.max(0.75, g));

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    if (this.fx === "wash" && this.fxLife > 0) {
      const wash = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.2);
      wash.addColorStop(0, `hsla(${this.fxHue}, 75%, 45%, ${this.fxLife * 0.32 * g})`);
      wash.addColorStop(0.55, `hsla(${(this.fxHue + 90) % 360}, 70%, 35%, ${this.fxLife * 0.16 * g})`);
      wash.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = wash;
      this.ctx.fillRect(0, 0, w, h);
    }

    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li]!;
      const band =
        layer.role === "bass" ? b
        : layer.role === "mid" ? m
        : layer.role === "high" ? hi
        : (b + m + hi) / 3;

      layer.hueDrift = (layer.hueDrift + delta * (12 + band * 55 + hi * 35) + (triggers.beat ? 10 : 0)) % 360;
      const recipe: FractalRecipe = {
        ...layer.recipe,
        hueSeed: (layer.recipe.hueSeed + layer.hueDrift) % 360,
        twist: layer.recipe.twist + this.morph * (0.15 + band * 0.4),
        scale: layer.recipe.scale * (0.85 + band * 0.45 + punch * 0.12 + (triggers.beat ? 0.08 : 0)),
      };

      drawFractalPattern({
        ctx: this.ctx,
        recipe,
        cx,
        cy,
        maxR: maxR * (0.7 + li * 0.12),
        g,
        t,
        bass: b,
        mid: m,
        high: hi,
        env: e,
        punch,
        beat: triggers.beat,
        morph: this.morph + li,
      });
    }

    if (this.fx === "pop" && this.fxLife > 0) {
      const pops = 24;
      for (let i = 0; i < pops; i++) {
        const a = (i / pops) * Math.PI * 2 + t * 2;
        const rad = maxR * (0.15 + (i % 5) * 0.12) * (0.8 + this.fxLife);
        this.ctx.fillStyle = `hsla(${(this.fxHue + i * 15) % 360}, 100%, 70%, ${this.fxLife * 0.5 * g})`;
        this.ctx.beginPath();
        this.ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 2 + punch * 4 + hi * 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    if (this.scramble > 0.05) {
      for (let k = 0; k < 3; k++) {
        const seedRng = createSeededRng(((t * 80) | 0) * 911 + k * 173 + (this.fxHue | 0));
        const recipe = pickFractalRecipe(seedRng);
        drawFractalPattern({
          ctx: this.ctx,
          recipe: { ...recipe, scale: recipe.scale * this.scramble * (0.4 + seedRng() * 0.5) },
          cx,
          cy,
          maxR,
          g: g * this.scramble,
          t,
          bass: b,
          mid: m,
          high: hi,
          env: e,
          punch,
          beat: triggers.beat,
          morph: this.morph * 2 + k,
        });
      }
    }

    // Soft core
    const coreR = maxR * (0.04 + e * 0.05 + r * 0.03 + (triggers.beat ? 0.03 : 0));
    const core = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4);
    core.addColorStop(0, `hsla(${this.layers[0]?.hueDrift ?? 0}, 90%, 75%, ${(0.4 + punch * 0.3) * g})`);
    core.addColorStop(0.4, `hsla(${this.layers[1]?.hueDrift ?? 120}, 80%, 45%, ${(0.15 + e * 0.15) * g})`);
    core.addColorStop(1, "hsla(0,0%,0%,0)");
    this.ctx.fillStyle = core;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, coreR * 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalCompositeOperation = "source-over";
  }
}
