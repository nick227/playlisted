import type { FractalKind, FractalMood, FractalRecipe, FxMode, Rng } from "./radialTypes";

const KINDS: FractalKind[] = [
  "juliaOrbit", "spiralTree", "ifsDust", "mandalaNest",
  "phyllotaxis", "kochBurst", "apollonian", "flowField",
  "roseCurve", "lissajous", "vortex", "starLattice", "burstRays", "weave",
];

const MOODS: FractalMood[] = ["void", "neon", "blood", "ice", "acid", "amber"];

/** Mood-biased hue seeds for darker site palette. */
function moodHue(mood: FractalMood, rng: Rng): number {
  switch (mood) {
    case "void":
      return 250 + rng() * 50;
    case "neon":
      return rng() < 0.5 ? 300 + rng() * 40 : 160 + rng() * 40;
    case "blood":
      return rng() < 0.7 ? rng() * 25 : 340 + rng() * 20;
    case "ice":
      return 180 + rng() * 50;
    case "acid":
      return 70 + rng() * 50;
    case "amber":
    default:
      return 20 + rng() * 40;
  }
}

export function pickFractalRecipe(rng: Rng): FractalRecipe {
  const mood = MOODS[Math.floor(rng() * MOODS.length)]!;
  const roll = rng();
  // Weight spectrum: fine / bold / beam
  const weight =
    roll < 0.25 ? 0.9 + rng() * 0.5
    : roll < 0.7 ? 1.4 + rng() * 1.2
    : 2.6 + rng() * 2.4;

  return {
    kind: KINDS[Math.floor(rng() * KINDS.length)]!,
    depth: 2 + Math.floor(rng() * 4),
    branches: 3 + Math.floor(rng() * 6),
    twist: rng() * Math.PI * 2,
    scale: 0.45 + rng() * 0.7,
    density: 0.25 + rng() * 0.85,
    hueSeed: moodHue(mood, rng),
    soft: rng(),
    weight,
    mood,
    mirror: rng() < 0.35,
    spin: 0.4 + rng() * 1.8,
  };
}

export function pickFxMode(rng: Rng): FxMode {
  const roll = rng();
  if (roll < 0.28) return "none";
  if (roll < 0.42) return "wash";
  if (roll < 0.56) return "pop";
  if (roll < 0.68) return "ring";
  if (roll < 0.8) return "slash";
  if (roll < 0.9) return "bloom";
  return "scramble";
}
