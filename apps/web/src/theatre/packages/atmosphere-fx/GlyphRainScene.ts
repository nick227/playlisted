import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, centroid, env, fluxHigh, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type GlyphSet = "runes" | "alchemical" | "greekSigil" | "binaryHex" | "tallyGlitch";

const GLYPH_SETS: Record<GlyphSet, string> = {
  runes: "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ",
  alchemical: "☉☾☿♀♂♃♄⚸⚹⚺⚻🜁🜂🜃🜄",
  greekSigil: "ΑΒΓΔΘΞΣΦΨΩλφψΞ",
  binaryHex: "0123456789ABCDEF",
  tallyGlitch: "†‡⁂※◆◇▲▼△▽¤⟁⟒",
};

const SET_ORDER: GlyphSet[] = ["runes", "alchemical", "greekSigil", "binaryHex", "tallyGlitch"];

/** Rain density — column spacing, trail length, and count of active columns. */
export const GLYPH_DENSITY_PCT = 60;

function createSeededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Deterministic per-cell hash so glyphs stay stable between flicker re-rolls
 * without needing a stored buffer per row. */
function hashChar(set: string, a: number, b: number, c: number): string {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = (Math.imul(h, 1274126177)) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return set[h % set.length]!;
}

type Column = {
  x: number;
  headY: number;
  speed: number;
  trailLen: number;
  charset: GlyphSet;
  hueSeed: number;
  epoch: number;
  colSeed: number;
  cell: number;
};

/**
 * Occult glyph rain — Matrix-style falling columns drawn from one of five
 * curated symbol alphabets (runes, alchemical, Greek, hex, glitch marks).
 * Highs drive fall speed and active column count; per-band onset flux drives
 * how often glyphs flicker to a new character; beats detonate an oversized
 * "power glyph" flash at a random column head.
 */
export class AtmosphereGlyphRainScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private rng = createSeededRng((Math.random() * 1e9) | 0);
  private columns: Column[] = [];
  private lastT = 0;
  private flickerAccum = 0;
  private prevW = 0;

  private buildColumns(w: number, h: number) {
    const density = Math.max(0, Math.min(1, GLYPH_DENSITY_PCT / 100));
    const gap = Math.max(14, 42 - density * 26);
    const cols = Math.max(4, Math.ceil(w / gap));
    this.columns = [];
    for (let i = 0; i < cols; i++) {
      this.columns.push({
        x: (i + 0.5) * gap,
        headY: -this.rng() * h,
        speed: h * (0.1 + this.rng() * 0.16) * (0.5 + density),
        trailLen: 6 + Math.floor(this.rng() * (8 + density * 10)),
        charset: SET_ORDER[Math.floor(this.rng() * SET_ORDER.length)]!,
        hueSeed: (this.rng() - 0.5) * 40,
        epoch: Math.floor(this.rng() * 1000),
        colSeed: Math.floor(this.rng() * 1e6),
        cell: 16 + Math.floor(this.rng() * 6),
      });
    }
  }

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.05, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const cen = centroid(context);
    const fh = fluxHigh(context);
    const punch = beatPunch(context);
    const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
    const t = context.shared.time.elapsed * 0.001;
    const delta = this.lastT > 0 ? Math.min(0.05, Math.max(0.008, t - this.lastT)) : 1 / 60;
    this.lastT = t;

    const pal = this.palette.tick(delta, punch);
    const tone = moodTone(pal.mood, hi);

    const w = this.cssWidth;
    const h = this.cssHeight;
    if (this.columns.length === 0 || Math.abs(w - this.prevW) > 40) {
      this.buildColumns(w, h);
      this.prevW = w;
    }

    this.flickerAccum += delta * (2 + fh * 40 + hi * 6);

    this.ctx.clearRect(0, 0, w, h);

    // Ambient backlight wash so the rain has depth to fall through.
    this.ctx.globalCompositeOperation = "source-over";
    const wash = this.ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, hsla(pal.a, tone.s * 0.5, 6, (0.1 + e * 0.06) * g));
    wash.addColorStop(1, hsla(pal.b, tone.s * 0.5, 4, (0.16 + b * 0.08) * g));
    this.ctx.fillStyle = wash;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.globalCompositeOperation = "lighter";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    const sizePulse = 1 + Math.sin(t * 2.2) * 0.06 * m;
    const speedMul = 0.5 + hi * 1.4;

    let flashColIndex = -1;
    if (triggers.beat || punch > 0.6) {
      flashColIndex = Math.floor(this.rng() * this.columns.length);
    }

    for (let ci = 0; ci < this.columns.length; ci++) {
      const col = this.columns[ci]!;
      col.headY += delta * col.speed * speedMul;
      if (col.headY - col.trailLen * col.cell > h) {
        col.headY = -this.rng() * h * 0.4;
        col.speed = h * (0.1 + this.rng() * 0.16) * (0.5 + hi);
        col.charset = SET_ORDER[Math.floor(this.rng() * SET_ORDER.length)]!;
        col.hueSeed = (this.rng() - 0.5) * 40;
        col.epoch += 1;
      }

      const set = GLYPH_SETS[col.charset];
      const hue = pal.accent + col.hueSeed + cen * 60;

      for (let row = 0; row < col.trailLen; row++) {
        const y = col.headY - row * col.cell;
        if (y < -col.cell || y > h + col.cell) continue;
        const flickerEpoch = col.epoch + Math.floor(this.flickerAccum * 0.3 + row * 0.13);
        const ch = hashChar(set, col.colSeed, row, flickerEpoch);
        const fade = Math.max(0, 1 - row / col.trailLen);
        const alpha = Math.pow(fade, 1.4) * (0.35 + hi * 0.4) * g;
        if (alpha < 0.02) continue;
        const isHead = row === 0;
        this.ctx.font = `${Math.round(col.cell * (isHead ? 1.1 : 1) * sizePulse)}px "Segoe UI Symbol", sans-serif`;
        this.ctx.fillStyle = isHead
          ? hsla(pal.accent + col.hueSeed, 95, tone.l + 35, Math.min(1, alpha * 1.8 + 0.2))
          : hsla(hue, tone.s, tone.l + fade * 10, alpha);
        this.ctx.fillText(ch, col.x, y);
      }

      if (ci === flashColIndex) {
        const y = col.headY;
        const set2 = GLYPH_SETS[col.charset];
        const ch = hashChar(set2, col.colSeed, 0, col.epoch);
        this.ctx.font = `${Math.round(col.cell * 3.2)}px "Segoe UI Symbol", sans-serif`;
        this.ctx.fillStyle = hsla(pal.accent + col.hueSeed, 100, 82, 0.5 + punch * 0.3);
        this.ctx.fillText(ch, col.x, y);
        const glow = this.ctx.createRadialGradient(col.x, y, 0, col.x, y, col.cell * 6);
        glow.addColorStop(0, hsla(pal.accent, 100, 75, (0.3 + punch * 0.3) * g));
        glow.addColorStop(1, "hsla(0,0%,0%,0)");
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(col.x, y, col.cell * 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.globalCompositeOperation = "source-over";
  }
}
