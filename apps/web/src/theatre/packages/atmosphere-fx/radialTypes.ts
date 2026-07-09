/** Shared types + helpers for Atmosphere Multi-Shape fractals. */

export type FractalKind =
  | "juliaOrbit"
  | "spiralTree"
  | "ifsDust"
  | "mandalaNest"
  | "phyllotaxis"
  | "kochBurst"
  | "apollonian"
  | "flowField"
  | "roseCurve"
  | "lissajous"
  | "vortex"
  | "starLattice"
  | "burstRays"
  | "weave";

export type FractalMood = "void" | "neon" | "blood" | "ice" | "acid" | "amber";

export type FractalRecipe = {
  kind: FractalKind;
  depth: number;
  branches: number;
  twist: number;
  scale: number;
  density: number;
  hueSeed: number;
  soft: number;
  /** Line weight multiplier — thicker = more distinct. */
  weight: number;
  mood: FractalMood;
  /** Draw a mirrored / rotated twin. */
  mirror: boolean;
  /** Spin rate multiplier. */
  spin: number;
};

export type Rng = () => number;

export type FxMode = "none" | "wash" | "pop" | "scramble" | "ring" | "slash" | "bloom";

export type DrawFractalInput = {
  ctx: CanvasRenderingContext2D;
  recipe: FractalRecipe;
  cx: number;
  cy: number;
  maxR: number;
  g: number;
  t: number;
  bass: number;
  mid: number;
  high: number;
  env: number;
  punch: number;
  beat: boolean;
  morph: number;
};

export function createSeededRng(seed: number): Rng {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function hsla(h: number, s: number, l: number, a: number) {
  return `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;
}

/** Mood shifts sat/light for goth-electronica range. */
export function moodTone(mood: FractalMood, high: number): { s: number; l: number } {
  switch (mood) {
    case "void":
      return { s: 55 + high * 15, l: 38 + high * 12 };
    case "neon":
      return { s: 95, l: 58 + high * 18 };
    case "blood":
      return { s: 85, l: 42 + high * 14 };
    case "ice":
      return { s: 70, l: 62 + high * 16 };
    case "acid":
      return { s: 90, l: 52 + high * 20 };
    case "amber":
    default:
      return { s: 80, l: 50 + high * 15 };
  }
}

export function strokeW(recipe: FractalRecipe, base: number, audio = 0) {
  return Math.max(2, (base + audio) * recipe.weight);
}

export function strokeColor(
  recipe: FractalRecipe,
  hueOff: number,
  high: number,
  alpha: number,
) {
  const tone = moodTone(recipe.mood, high);
  return hsla(recipe.hueSeed + hueOff, tone.s, tone.l, alpha);
}
