import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, env, fxAmountOr, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type ShatterStyle = "spiderweb" | "starburstCrack" | "shard" | "bulletHole" | "iceCrack";

const STYLES: ShatterStyle[] = ["spiderweb", "starburstCrack", "shard", "bulletHole", "iceCrack"];

/** Max crack length as % of screen diagonal. */
export const SHATTER_SPREAD_PCT = 55;

function createSeededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type CrackSegment = { x1: number; y1: number; x2: number; y2: number; width: number; glintT: number };

type Impact = {
  ox: number;
  oy: number;
  life: number;
  segments: CrackSegment[];
  ringCount: number;
  hueSeed: number;
};

/** Recursively grows a jagged, tapering, occasionally-branching crack line. Every
 * angle/length/branch decision is drawn from the *same* running rng stream, so
 * each new fracture's shape is a continuation of everything shattered before it. */
function growCrack(
  rng: () => number,
  out: CrackSegment[],
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  depth: number,
  maxDepth: number,
  branchChance: number,
) {
  const steps = 3 + Math.floor(rng() * 3);
  let cx = x;
  let cy = y;
  let a = angle;
  const stepLen = length / steps;
  for (let i = 0; i < steps; i++) {
    a += (rng() - 0.5) * 0.55;
    const nx = cx + Math.cos(a) * stepLen;
    const ny = cy + Math.sin(a) * stepLen;
    const w = Math.max(0.4, width * (1 - i / steps));
    out.push({ x1: cx, y1: cy, x2: nx, y2: ny, width: w, glintT: rng() * 10 });
    if (depth < maxDepth && rng() < branchChance) {
      growCrack(
        rng,
        out,
        nx,
        ny,
        a + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.8),
        length * (0.35 + rng() * 0.25),
        width * 0.55,
        depth + 1,
        maxDepth,
        branchChance * 0.6,
      );
    }
    cx = nx;
    cy = ny;
    if (out.length > 400) return;
  }
}

/**
 * Broken-mirror FX — impacts crack the frame from a point on every hard bass
 * hit, then slowly heal. Each style changes the fracture topology itself
 * (radiating shards, concentric stress rings, branching ice-crack trees)
 * rather than just re-coloring the same shape.
 */
export class AtmosphereShatterScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private impacts: Impact[] = [];
  private rng = createSeededRng((Math.random() * 1e9) | 0);
  private style: ShatterStyle = "shard";
  private holdSec = 0;
  private nextHold = 8;
  private lastT = 0;
  private prevBass = 0;

  private restyle() {
    this.style = STYLES[Math.floor(this.rng() * STYLES.length)]!;
    this.nextHold = 6 + this.rng() * 10;
  }

  private spawnImpact(ox: number, oy: number, strength: number, maxLen: number) {
    const spokes =
      this.style === "bulletHole" ? 10 + Math.floor(this.rng() * 6)
      : this.style === "starburstCrack" ? 6 + Math.floor(this.rng() * 4)
      : 5 + Math.floor(this.rng() * 5);
    const maxDepth = this.style === "iceCrack" ? 4 : this.style === "shard" ? 2 : 1;
    const branchChance = this.style === "iceCrack" ? 0.55 : this.style === "shard" ? 0.35 : 0.15;

    const segments: CrackSegment[] = [];
    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2 + (this.rng() - 0.5) * 0.5;
      const len = maxLen * (0.5 + this.rng() * 0.5) * (0.6 + strength * 0.5);
      growCrack(this.rng, segments, ox, oy, angle, len, 2.6 + strength * 2.4, 0, maxDepth, branchChance);
    }

    this.impacts.push({
      ox,
      oy,
      life: 1,
      segments,
      ringCount: this.style === "spiderweb" ? 3 + Math.floor(this.rng() * 3) : 0,
      hueSeed: (this.rng() - 0.5) * 50,
    });
    if (this.impacts.length > 5) this.impacts.shift();
  }

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.05, env(context));
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
    if (this.holdSec >= this.nextHold || (triggers.chaosHit && this.rng() < 0.4)) {
      this.holdSec = 0;
      this.restyle();
    }

    const w = this.cssWidth;
    const h = this.cssHeight;
    const diag = Math.hypot(w, h);
    const maxLen = diag * (fxAmountOr(context, SHATTER_SPREAD_PCT) / 100) * (this.style === "bulletHole" ? 0.5 : 1);

    const bassEdge = b - this.prevBass;
    this.prevBass = b;
    if ((triggers.bassHit || bassEdge > 0.1) && b > 0.14) {
      const ox = w * (0.2 + this.rng() * 0.6);
      const oy = h * (0.2 + this.rng() * 0.6);
      this.spawnImpact(ox, oy, 0.5 + b * 0.6 + punch * 0.4, maxLen);
    }
    if (triggers.chaosHit) {
      this.spawnImpact(w * this.rng(), h * this.rng(), 0.8 + this.rng() * 0.5, maxLen * 1.1);
    }

    // Heal (fade) over time — slower when the room stays loud.
    const live: Impact[] = [];
    for (const impact of this.impacts) {
      impact.life -= delta * (0.12 + (1 - e) * 0.1);
      if (impact.life > 0) live.push(impact);
    }
    this.impacts = live;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    for (const impact of this.impacts) {
      const alpha = Math.max(0, impact.life) * g;

      if (impact.ringCount > 0) {
        for (let r = 1; r <= impact.ringCount; r++) {
          const rad = (maxLen / (impact.ringCount + 1)) * r * (0.9 + Math.sin(t * 0.6 + r) * 0.04);
          this.ctx.beginPath();
          this.ctx.arc(impact.ox, impact.oy, rad, 0, Math.PI * 2);
          this.ctx.strokeStyle = hsla(pal.b + impact.hueSeed, tone.s, tone.l + 10, alpha * 0.14);
          this.ctx.lineWidth = 1.2;
          this.ctx.stroke();
        }
      }

      for (const seg of impact.segments) {
        const glint = 0.5 + 0.5 * Math.sin(t * (5 + hi * 10) + seg.glintT);
        this.ctx.strokeStyle = hsla(pal.accent + impact.hueSeed, 90, tone.l + 22, alpha * (0.28 + glint * hi * 0.5));
        this.ctx.lineWidth = seg.width * (0.7 + glint * 0.3 * hi);
        this.ctx.beginPath();
        this.ctx.moveTo(seg.x1, seg.y1);
        this.ctx.lineTo(seg.x2, seg.y2);
        this.ctx.stroke();

        this.ctx.strokeStyle = hsla(pal.a + impact.hueSeed, tone.s, tone.l, alpha * 0.16);
        this.ctx.lineWidth = seg.width * 2.2;
        this.ctx.stroke();
      }

      // Bright core at the impact point
      const core = this.ctx.createRadialGradient(impact.ox, impact.oy, 0, impact.ox, impact.oy, 14 + m * 20);
      core.addColorStop(0, hsla(pal.accent + impact.hueSeed, 100, 80, alpha * 0.6));
      core.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = core;
      this.ctx.beginPath();
      this.ctx.arc(impact.ox, impact.oy, 14 + m * 20, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (triggers.bassHit || triggers.chaosHit) {
      this.ctx.fillStyle = hsla(pal.accent, 90, 75, (0.05 + punch * 0.08) * g);
      this.ctx.fillRect(0, 0, w, h);
    }

    this.ctx.globalCompositeOperation = "source-over";
  }
}
