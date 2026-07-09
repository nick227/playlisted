/** Random cool/hot palette pairs that morph over time for Bars FX. */

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
  let d = ((b - a + 540) % 360) - 180;
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

/** Build a contrasting cool/hot pair from a random seed hue. */
export function randomBarsPalette(rand = Math.random): BarsPalette {
  const coolA = rand() * 360;
  // Cool span across the spectrum (ghost field)
  const coolB = wrapHue(coolA + 40 + rand() * 80);
  // Hot pair roughly opposite for punch contrast
  const hotA = wrapHue(coolA + 140 + rand() * 80);
  const hotB = wrapHue(hotA + 25 + rand() * 55);
  return {
    coolA,
    coolB,
    hotA,
    hotB,
    fog: wrapHue(coolA - 20 + rand() * 40),
    spark: wrapHue(hotA + 30 + rand() * 50),
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
      this.blend = Math.min(1, this.blend + deltaSec / 4.5);
      if (this.blend >= 1) {
        this.current = this.next;
        this.holdSec = 0;
        this.nextHoldSec = 9 + Math.random() * 14;
      }
      return lerpPalette(this.current, this.next, this.blend);
    }

    this.holdSec += deltaSec;
    const rush = punch > 0.8 && Math.random() < 0.04;
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
