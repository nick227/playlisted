/** Procedural geometric shape generators for Atmosphere Multi-Shape (Radial). */

export type ShapeKind =
  | "polygon"
  | "star"
  | "rose"
  | "superellipse"
  | "lissajous"
  | "hypotrochoid"
  | "epicycloid"
  | "blob";

export type ShapeRecipe = {
  kind: ShapeKind;
  sides: number;
  density: number;
  twist: number;
  fat: number;
  spokes: number;
  nest: number;
};

export type Rng = () => number;

export function createSeededRng(seed: number): Rng {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pickShapeRecipe(rng: Rng): ShapeRecipe {
  const kinds: ShapeKind[] = [
    "polygon", "star", "rose", "superellipse", "lissajous", "hypotrochoid", "epicycloid", "blob",
  ];
  const kind = kinds[Math.floor(rng() * kinds.length)]!;
  return {
    kind,
    sides: 3 + Math.floor(rng() * 10),
    density: 2 + Math.floor(rng() * 7),
    twist: rng() * Math.PI * 2,
    fat: 0.35 + rng() * 0.9,
    spokes: 3 + Math.floor(rng() * 12),
    nest: 1 + Math.floor(rng() * 4),
  };
}

/** Radius at angle for a parametric recipe (unit-ish, ~0.4–1.2). */
export function radiusAt(recipe: ShapeRecipe, angle: number, morph: number): number {
  const a = angle + recipe.twist + morph * 0.4;
  const n = recipe.sides;
  const d = recipe.density;
  const f = recipe.fat;

  switch (recipe.kind) {
    case "polygon": {
      const sector = (Math.PI * 2) / n;
      const local = ((a % sector) + sector) % sector - sector * 0.5;
      return f / Math.cos(local);
    }
    case "star": {
      const k = 2 + (n % 5);
      return f * (0.55 + 0.45 * Math.abs(Math.cos(a * k * 0.5)));
    }
    case "rose":
      return f * (0.35 + 0.65 * Math.abs(Math.cos(d * a)));
    case "superellipse": {
      const p = 0.4 + (n % 6) * 0.25;
      const c = Math.abs(Math.cos(a));
      const s = Math.abs(Math.sin(a));
      return f / Math.pow(Math.pow(c, p) + Math.pow(s, p), 1 / p);
    }
    case "lissajous": {
      const x = Math.sin(d * a);
      const y = Math.sin(n * a + morph);
      return f * (0.45 + 0.55 * Math.hypot(x, y) * 0.7);
    }
    case "hypotrochoid": {
      const R = 1;
      const rr = 1 / Math.max(2, n);
      const h = 0.4 + f * 0.4;
      const x = (R - rr) * Math.cos(a) + h * Math.cos(((R - rr) / rr) * a);
      const y = (R - rr) * Math.sin(a) - h * Math.sin(((R - rr) / rr) * a);
      return f * 0.55 * Math.hypot(x, y);
    }
    case "epicycloid": {
      const R = 1;
      const rr = 1 / Math.max(2, d);
      const x = (R + rr) * Math.cos(a) - rr * Math.cos(((R + rr) / rr) * a);
      const y = (R + rr) * Math.sin(a) - rr * Math.sin(((R + rr) / rr) * a);
      return f * 0.4 * Math.hypot(x, y);
    }
    case "blob":
    default: {
      return (
        f
        * (0.7
          + 0.18 * Math.sin(a * 2 + morph)
          + 0.12 * Math.sin(a * 3 - morph * 1.3)
          + 0.08 * Math.sin(a * 5 + morph * 0.7)
          + 0.05 * Math.sin(a * n + morph * 2))
      );
    }
  }
}

export function buildShapePoints(
  recipe: ShapeRecipe,
  cx: number,
  cy: number,
  scale: number,
  count: number,
  morph: number,
  audioWarp: Float32Array | number[],
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const u = i / count;
    const ang = u * Math.PI * 2 - Math.PI * 0.5;
    const warp = audioWarp[i % audioWarp.length] ?? 0;
    const rr = scale * radiusAt(recipe, ang, morph) * (1 + warp);
    pts.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr });
  }
  return pts;
}

export type FxMode = "none" | "wash" | "pop" | "scramble";

export function pickFxMode(rng: Rng): FxMode {
  const roll = rng();
  if (roll < 0.45) return "none";
  if (roll < 0.65) return "wash";
  if (roll < 0.85) return "pop";
  return "scramble";
}
