/** Comic perimeter aperture shapes for Atmosphere Vignette. */

export type VignetteShapeKind =
  | "scallop"
  | "spike"
  | "zigzag"
  | "wave"
  | "gear"
  | "burst"
  | "notch"
  | "ripple";

export type VignetteShapeRecipe = {
  kind: VignetteShapeKind;
  lobes: number;
  depth: number;
  twist: number;
  sharpness: number;
  spin: number;
};

export type Rng = () => number;

export function createSeededRng(seed: number): Rng {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const KINDS: VignetteShapeKind[] = [
  "scallop", "spike", "zigzag", "wave", "gear", "burst", "notch", "ripple",
];

export function pickVignetteShape(rng: Rng): VignetteShapeRecipe {
  return {
    kind: KINDS[Math.floor(rng() * KINDS.length)]!,
    lobes: 5 + Math.floor(rng() * 10),
    depth: 0.08 + rng() * 0.28,
    twist: rng() * Math.PI * 2,
    sharpness: 0.3 + rng() * 0.7,
    spin: (rng() < 0.5 ? -1 : 1) * (0.15 + rng() * 0.55),
  };
}

/**
 * Polar radius multiplier for aperture edge at angle `a`.
 * Returns ~1 with comic angular modulation (audio-reactive).
 */
export function apertureRadiusMul(
  recipe: VignetteShapeRecipe,
  a: number,
  t: number,
  bass: number,
  mid: number,
  high: number,
  punch: number,
  beat: boolean,
): number {
  const lobes = recipe.lobes;
  const d = recipe.depth * (0.85 + bass * 0.5 + punch * 0.35 + (beat ? 0.15 : 0));
  const phase = recipe.twist + t * recipe.spin + mid * 0.4;
  const sharp = recipe.sharpness;

  switch (recipe.kind) {
    case "scallop": {
      const s = Math.sin(a * lobes + phase);
      return 1 - d * (0.5 + 0.5 * s) - high * 0.04 * Math.sin(a * lobes * 2 + t);
    }
    case "spike": {
      // Pointy comic teeth
      const u = ((a * lobes) / (Math.PI * 2) + phase) % 1;
      const tooth = 1 - Math.pow(Math.abs(u * 2 - 1), 0.35 + sharp * 0.5);
      return 1 - d * tooth * (0.7 + punch * 0.5);
    }
    case "zigzag": {
      const u = ((a / (Math.PI * 2)) * lobes + phase * 0.2) % 1;
      const zig = u < 0.5 ? u * 2 : 2 - u * 2;
      return 1 - d * zig * (0.8 + mid * 0.4);
    }
    case "wave": {
      return 1
        - d * 0.55 * Math.sin(a * lobes + phase)
        - d * 0.35 * Math.sin(a * (lobes * 0.5) - t * 1.2)
        - high * 0.05 * Math.sin(a * 3 + t * 2);
    }
    case "gear": {
      const teeth = Math.sin(a * lobes + phase);
      const flat = teeth > 0 ? Math.pow(teeth, 0.4 + sharp) : 0;
      return 1 - d * flat * (0.9 + bass * 0.3);
    }
    case "burst": {
      // Comic action burst — irregular spikes
      const s1 = Math.abs(Math.sin(a * lobes + phase));
      const s2 = Math.abs(Math.sin(a * (lobes + 3) - phase * 1.3));
      const burst = Math.pow(Math.max(s1, s2 * 0.85), 0.5 + sharp * 0.4);
      return 1 - d * burst * (0.75 + punch * 0.55 + (beat ? 0.2 : 0));
    }
    case "notch": {
      const s = Math.cos(a * lobes + phase);
      const notch = s > 0.55 ? (s - 0.55) / 0.45 : 0;
      return 1 - d * Math.pow(notch, 0.6) * (1 + mid * 0.4);
    }
    case "ripple":
    default: {
      return 1
        - d * 0.4 * Math.sin(a * lobes + phase + punch)
        - d * 0.25 * Math.sin(a * 2 + t * 1.5)
        - d * 0.2 * Math.sin(a * (lobes + 1) - t);
    }
  }
}

/** Append closed aperture contour (does not beginPath — caller owns path). */
export function appendAperturePath(
  ctx: CanvasRenderingContext2D,
  recipe: VignetteShapeRecipe,
  cx: number,
  cy: number,
  baseR: number,
  steps: number,
  t: number,
  bass: number,
  mid: number,
  high: number,
  punch: number,
  beat: boolean,
) {
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const mul = apertureRadiusMul(recipe, a, t, bass, mid, high, punch, beat);
    const r = Math.max(2, baseR * mul);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Stroke/fill a single aperture contour. */
export function strokeAperturePath(
  ctx: CanvasRenderingContext2D,
  recipe: VignetteShapeRecipe,
  cx: number,
  cy: number,
  baseR: number,
  steps: number,
  t: number,
  bass: number,
  mid: number,
  high: number,
  punch: number,
  beat: boolean,
) {
  ctx.beginPath();
  appendAperturePath(ctx, recipe, cx, cy, baseR, steps, t, bass, mid, high, punch, beat);
}
