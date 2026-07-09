import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, fxAmountOr, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";
import {
  apertureRadiusMul,
  appendAperturePath,
  createSeededRng,
  pickVignetteShape,
  strokeAperturePath,
  type VignetteShapeRecipe,
} from "./vignetteGeometry";

/**
 * Matte coverage from screen edges inward.
 * 0 = thin comic border; 100 = aperture collapses — edges meet at center.
 */
export const VIGNETTE_MAX_SIZE_PCT = 15;

/**
 * Comic graphical vignette — dancing colored perimeter matte.
 * Not soft darkness: a bounding frame whose inner silhouette shifts,
 * pops on notes, and morphs shape over time.
 */
export class AtmosphereVignetteScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private rng = createSeededRng((Math.random() * 1e9) | 0);
  private shape: VignetteShapeRecipe = pickVignetteShape(this.rng);
  private nextShape: VignetteShapeRecipe = pickVignetteShape(this.rng);
  private shapeBlend = 1;
  private holdSec = 0;
  private nextHold = 5;
  private lastT = 0;
  private pop = 0;
  private rimFlash = 0;

  private morphShape() {
    this.shape = this.shapeBlend >= 1 ? this.nextShape : this.shape;
    this.nextShape = pickVignetteShape(this.rng);
    this.shapeBlend = 0;
    this.nextHold = 3.5 + this.rng() * 8;
  }

  private liveShape(): VignetteShapeRecipe {
    if (this.shapeBlend >= 1) return this.shape;
    const u = this.shapeBlend * this.shapeBlend * (3 - 2 * this.shapeBlend);
    const a = this.shape;
    const b = this.nextShape;
    return {
      kind: u < 0.5 ? a.kind : b.kind,
      lobes: Math.round(a.lobes + (b.lobes - a.lobes) * u),
      depth: a.depth + (b.depth - a.depth) * u,
      twist: a.twist + (b.twist - a.twist) * u,
      sharpness: a.sharpness + (b.sharpness - a.sharpness) * u,
      spin: a.spin + (b.spin - a.spin) * u,
    };
  }

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0, env(context));
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
    if (this.shapeBlend < 1) this.shapeBlend = Math.min(1, this.shapeBlend + delta / 2.2);
    if (this.holdSec >= this.nextHold || triggers.chaosHit) {
      this.holdSec = 0;
      this.morphShape();
    }

    if (triggers.bassHit || triggers.beat || punch > 0.55) {
      this.pop = Math.min(1, this.pop + 0.45 + punch * 0.35);
      this.rimFlash = Math.min(1, this.rimFlash + 0.55 + hi * 0.3);
    }
    if (triggers.highsHit || triggers.midsHit) {
      this.rimFlash = Math.min(1, this.rimFlash + 0.35);
    }
    this.pop *= Math.exp(-3.5 * delta);
    this.rimFlash *= Math.exp(-2.8 * delta);

    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Size: 100 → aperture radius ~0 (edges meet in middle)
    const size = Math.min(1, Math.max(0, fxAmountOr(context, VIGNETTE_MAX_SIZE_PCT) / 100));
    const maxR = Math.hypot(w, h) * 0.52;
    const open = Math.max(0, 1 - size);
    const baseR = maxR * open * (0.92 - this.pop * 0.08 - b * 0.04) + (open <= 0.02 ? 0 : 4);

    const recipe = this.liveShape();
    const steps = 80;

    this.ctx.clearRect(0, 0, w, h);

    // Matte: full screen minus dancing aperture (evenodd)
    this.ctx.beginPath();
    this.ctx.rect(0, 0, w, h);
    appendAperturePath(
      this.ctx, recipe, cx, cy, Math.max(1, baseR), steps,
      t, b, m, hi, punch, triggers.beat,
    );
    this.ctx.fillStyle = `rgba(0,0,0,${0.7 + size * 0.22})`;
    this.ctx.fill("evenodd");

    // Colored wash only in the matte ring
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, w, h);
    appendAperturePath(
      this.ctx, recipe, cx, cy, Math.max(1, baseR), steps,
      t, b, m, hi, punch, triggers.beat,
    );
    this.ctx.clip("evenodd");
    const wash = this.ctx.createRadialGradient(cx, cy, Math.max(1, baseR * 0.75), cx, cy, maxR);
    wash.addColorStop(0, hsla(pal.a, tone.s, tone.l * 0.35, (0.18 + e * 0.15) * g));
    wash.addColorStop(0.55, hsla(pal.b, tone.s, tone.l * 0.4, (0.25 + m * 0.12) * g));
    wash.addColorStop(1, hsla(pal.c, tone.s + 5, tone.l * 0.3, (0.38 + b * 0.15) * g));
    this.ctx.fillStyle = wash;
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.restore();

    if (baseR < 2) {
      if (this.rimFlash > 0.05) {
        this.ctx.fillStyle = hsla(pal.accent, 95, 60, this.rimFlash * 0.25 * g);
        this.ctx.fillRect(0, 0, w, h);
      }
      return;
    }

    this.ctx.globalCompositeOperation = "lighter";
    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";

    // Outer comic ink
    strokeAperturePath(
      this.ctx, recipe, cx, cy, baseR * 1.015, steps,
      t, b, m, hi, punch, triggers.beat,
    );
    this.ctx.strokeStyle = hsla(pal.a, tone.s + 5, tone.l + 5, (0.38 + e * 0.25 + this.rimFlash * 0.35) * g);
    this.ctx.lineWidth = 11 + punch * 14 + this.pop * 12 + size * 8;
    this.ctx.stroke();

    // Inner accent rim
    strokeAperturePath(
      this.ctx, recipe, cx, cy, baseR * 0.965, steps,
      t + 0.04, b, m, hi, punch, triggers.beat,
    );
    this.ctx.strokeStyle = hsla(pal.accent, 95, tone.l + 15, (0.42 + this.rimFlash * 0.45 + hi * 0.2) * g);
    this.ctx.lineWidth = 3.5 + this.rimFlash * 9 + punch * 5;
    this.ctx.stroke();

    // Chromatic offsets
    for (const [ox, hue, alpha] of [
      [5, pal.b, 0.24],
      [-5, pal.c, 0.22],
    ] as const) {
      strokeAperturePath(
        this.ctx, recipe, cx + ox, cy, baseR, steps,
        t, b, m, hi, punch, triggers.beat,
      );
      this.ctx.strokeStyle = hsla(hue, 90, 55, (alpha + this.rimFlash * 0.22) * g);
      this.ctx.lineWidth = 2.5 + punch * 3;
      this.ctx.stroke();
    }

    // Note ticks along live silhouette
    const ticks = recipe.lobes * 2;
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2 + recipe.twist + t * recipe.spin * 0.5;
      const band = i % 3 === 0 ? b : i % 3 === 1 ? m : hi;
      const mul = apertureRadiusMul(recipe, a, t, b, m, hi, punch, triggers.beat);
      const r0 = baseR * mul;
      const len = (10 + band * 32 + this.pop * 20 + (triggers.beat ? 12 : 0)) * g;
      this.ctx.strokeStyle = hsla(pal.accent + i * 12, 95, 65, (0.22 + band * 0.35 + this.pop * 0.25) * g);
      this.ctx.lineWidth = 2.2 + band * 3.5 + this.pop * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      this.ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
      this.ctx.stroke();
    }

    if (this.pop > 0.15 || punch > 0.4) {
      for (const [lx, ly] of [[0, 0], [w, 0], [0, h], [w, h]] as const) {
        const br = Math.min(w, h) * (0.08 + this.pop * 0.12 + punch * 0.06);
        const burst = this.ctx.createRadialGradient(lx, ly, 0, lx, ly, br);
        burst.addColorStop(0, hsla(pal.accent, 100, 70, (0.28 + this.pop * 0.3) * g));
        burst.addColorStop(1, "hsla(0,0%,0%,0)");
        this.ctx.fillStyle = burst;
        this.ctx.beginPath();
        this.ctx.arc(lx, ly, br, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.globalCompositeOperation = "source-over";
  }
}
