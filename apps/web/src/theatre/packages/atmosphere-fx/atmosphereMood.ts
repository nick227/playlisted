/** Shared goth-electronica mood palettes for Glow / Vignette / Color Wash. */

export type AtmosphereMood = "void" | "neon" | "blood" | "ice" | "acid" | "amber";

export type MoodPalette = {
  mood: AtmosphereMood;
  a: number;
  b: number;
  c: number;
  accent: number;
};

function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function lerpHue(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return wrapHue(a + d * t);
}

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length) % items.length]!;
}

const MOOD_RECIPES: readonly MoodPalette[] = [
  { mood: "void", a: 268, b: 295, c: 318, accent: 310 },
  { mood: "neon", a: 300, b: 330, c: 170, accent: 155 },
  { mood: "blood", a: 345, b: 8, c: 28, accent: 18 },
  { mood: "ice", a: 188, b: 210, c: 280, accent: 195 },
  { mood: "acid", a: 145, b: 165, c: 310, accent: 55 },
  { mood: "amber", a: 28, b: 42, c: 220, accent: 48 },
];

export function randomMoodPalette(rand = Math.random): MoodPalette {
  const base = pick(MOOD_RECIPES, rand);
  const j = (h: number, amt: number) => wrapHue(h + (rand() - 0.5) * amt);
  return {
    mood: base.mood,
    a: j(base.a, 16),
    b: j(base.b, 16),
    c: j(base.c, 18),
    accent: j(base.accent, 20),
  };
}

function lerpPalette(from: MoodPalette, to: MoodPalette, t: number): MoodPalette {
  const u = t * t * (3 - 2 * t);
  return {
    mood: u < 0.5 ? from.mood : to.mood,
    a: lerpHue(from.a, to.a, u),
    b: lerpHue(from.b, to.b, u),
    c: lerpHue(from.c, to.c, u),
    accent: lerpHue(from.accent, to.accent, u),
  };
}

/** Morphing mood engine — shared by soft Atmosphere presets. */
export class ShiftingMoodPalette {
  private current: MoodPalette;
  private next: MoodPalette;
  private blend = 1;
  private holdSec = 0;
  private nextHoldSec = 10;

  constructor() {
    this.current = randomMoodPalette();
    this.next = randomMoodPalette();
  }

  tick(deltaSec: number, punch: number): MoodPalette {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + deltaSec / 4.5);
      if (this.blend >= 1) {
        this.current = this.next;
        this.holdSec = 0;
        this.nextHoldSec = 8 + Math.random() * 14;
      }
      return lerpPalette(this.current, this.next, this.blend);
    }
    this.holdSec += deltaSec;
    if (this.holdSec >= this.nextHoldSec || (punch > 0.85 && Math.random() < 0.04)) {
      this.next = randomMoodPalette();
      this.blend = 0;
    }
    return this.current;
  }
}

export function hsla(h: number, s: number, l: number, a: number) {
  return `hsla(${wrapHue(h)}, ${s}%, ${l}%, ${a})`;
}

/** Mood-tuned sat/light for dark club look. */
export function moodTone(mood: AtmosphereMood, high = 0): { s: number; l: number } {
  switch (mood) {
    case "void":
      return { s: 60 + high * 15, l: 40 + high * 12 };
    case "neon":
      return { s: 95, l: 58 + high * 16 };
    case "blood":
      return { s: 85, l: 42 + high * 14 };
    case "ice":
      return { s: 72, l: 58 + high * 14 };
    case "acid":
      return { s: 90, l: 50 + high * 18 };
    case "amber":
    default:
      return { s: 82, l: 48 + high * 14 };
  }
}
