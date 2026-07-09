/** Dark goth-electronica / hip-hop palette morphs for Bars FX. */

export type BarsPalette = {
  coolA: number;
  coolB: number;
  hotA: number;
  hotB: number;
  fog: number;
  spark: number;
};

function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function lerpHue(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return wrapHue(a + d * t);
}

function lerpPalette(a: BarsPalette, b: BarsPalette, t: number): BarsPalette {
  const u = t * t * (3 - 2 * t);
  return {
    coolA: lerpHue(a.coolA, b.coolA, u),
    coolB: lerpHue(a.coolB, b.coolB, u),
    hotA: lerpHue(a.hotA, b.hotA, u),
    hotB: lerpHue(a.hotB, b.hotB, u),
    fog: lerpHue(a.fog, b.fog, u),
    spark: lerpHue(a.spark, b.spark, u),
  };
}

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length) % items.length]!;
}

function jitter(hue: number, amount: number, rand: () => number): number {
  return wrapHue(hue + (rand() - 0.5) * amount);
}

/**
 * Curated dark club recipes — cool ghost field + hot hit contrast.
 * Families: void purple, blood, ice cyan, acid, amber gold.
 */
const GOTH_RECIPES: readonly (Omit<BarsPalette, never>)[] = [
  // Void purple → neon magenta
  { coolA: 268, coolB: 295, hotA: 318, hotB: 338, fog: 275, spark: 310 },
  // Blood wine → crimson punch
  { coolA: 340, coolB: 355, hotA: 8, hotB: 28, fog: 345, spark: 18 },
  // Ice cyan → electric violet
  { coolA: 188, coolB: 210, hotA: 280, hotB: 305, fog: 220, spark: 195 },
  // Midnight indigo → hot pink
  { coolA: 230, coolB: 255, hotA: 325, hotB: 345, fog: 240, spark: 55 },
  // Acid club green → magenta
  { coolA: 145, coolB: 165, hotA: 310, hotB: 330, fog: 160, spark: 50 },
  // Smoke slate → amber gold (hip-hop warmth)
  { coolA: 210, coolB: 235, hotA: 38, hotB: 52, fog: 225, spark: 45 },
  // Deep plum → blood orange
  { coolA: 285, coolB: 305, hotA: 15, hotB: 32, fog: 290, spark: 25 },
  // Cold steel → violet flare
  { coolA: 200, coolB: 220, hotA: 270, hotB: 295, fog: 215, spark: 185 },
  // Black cherry → neon rose
  { coolA: 330, coolB: 348, hotA: 300, hotB: 320, fog: 335, spark: 48 },
  // Underground teal → purple hit
  { coolA: 175, coolB: 195, hotA: 265, hotB: 290, fog: 185, spark: 170 },
];

/** Build a goth/hip-hop palette from curated recipes + light jitter. */
export function randomBarsPalette(rand = Math.random): BarsPalette {
  const base = pick(GOTH_RECIPES, rand);
  return {
    coolA: jitter(base.coolA, 14, rand),
    coolB: jitter(base.coolB, 14, rand),
    hotA: jitter(base.hotA, 12, rand),
    hotB: jitter(base.hotB, 12, rand),
    fog: jitter(base.fog, 10, rand),
    spark: jitter(base.spark, 16, rand),
  };
}

export class ShiftingBarsPalette {
  private current: BarsPalette;
  private next: BarsPalette;
  private blend = 1;
  private holdSec = 0;
  private nextHoldSec = 12;

  constructor() {
    this.current = randomBarsPalette();
    this.next = randomBarsPalette();
  }

  /** Advance morph; strong punches can shorten the hold for fresher shifts. */
  tick(deltaSec: number, punch: number): BarsPalette {
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + deltaSec / 5);
      if (this.blend >= 1) {
        this.current = this.next;
        this.holdSec = 0;
        this.nextHoldSec = 11 + Math.random() * 16;
      }
      return lerpPalette(this.current, this.next, this.blend);
    }

    this.holdSec += deltaSec;
    const rush = punch > 0.8 && Math.random() < 0.035;
    if (this.holdSec >= this.nextHoldSec || rush) {
      this.next = randomBarsPalette();
      this.blend = 0;
    }
    return this.current;
  }

  live(): BarsPalette {
    if (this.blend >= 1) return this.current;
    return lerpPalette(this.current, this.next, this.blend);
  }
}

export function coolHueAt(p: BarsPalette, tNorm: number): number {
  return lerpHue(p.coolA, p.coolB, tNorm);
}

export function hotHueAt(p: BarsPalette, tNorm: number): number {
  return lerpHue(p.hotA, p.hotB, tNorm);
}
