import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, centroid, env, fxAmountOr, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type WarpStyle = "hyperspace" | "vortexPull" | "driftField" | "gridWarp" | "novaBurst";

const STYLES: WarpStyle[] = ["hyperspace", "vortexPull", "driftField", "gridWarp", "novaBurst"];

/** Base streak speed and max speed ceiling. */
export const WARP_SPEED_PCT = 65;

function createSeededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Star = {
  angle: number;
  radius: number;
  speed: number;
  depth: number;
  hueSeed: number;
  twinklePhase: number;
};

/**
 * Hyperspace field — stars stream from (or, in vortexPull, in toward) the
 * center. Continuous bass/env-driven speed is the ambient baseline; a
 * chaosHit instead detonates a single sharp "warp jump" spike that decays,
 * a distinct one-shot trigger mechanic rather than the gradual momentum
 * build used elsewhere in this package.
 */
export class AtmosphereWarpStarfieldScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private rng = createSeededRng((Math.random() * 1e9) | 0);
  private stars: Star[] = [];
  private style: WarpStyle = "hyperspace";
  private holdSec = 0;
  private nextHold = 9;
  private lastT = 0;
  private warpBurst = 0;
  private novaSec = 0;
  private nextNova = 1.4;
  private prevW = 0;
  private fieldSpin = 0;

  private buildField(count: number, edge: boolean) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push(this.freshStar(edge));
    }
  }

  private freshStar(edge: boolean): Star {
    const spokeCount = 14;
    const angle = this.style === "gridWarp"
      ? (Math.floor(this.rng() * spokeCount) / spokeCount) * Math.PI * 2 + (this.rng() - 0.5) * 0.08
      : this.rng() * Math.PI * 2;
    return {
      angle,
      radius: edge ? 0.05 + this.rng() * 0.1 : this.rng(),
      speed: 0.4 + this.rng() * 0.9,
      depth: 0.35 + this.rng() * 0.65,
      hueSeed: (this.rng() - 0.5) * 40,
      twinklePhase: this.rng() * Math.PI * 2,
    };
  }

  private restyle() {
    this.style = STYLES[Math.floor(this.rng() * STYLES.length)]!;
    this.nextHold = 8 + this.rng() * 10;
    const count = this.stars.length || 90;
    this.buildField(count, this.style === "vortexPull");
  }

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.05, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const cen = centroid(context);
    const punch = beatPunch(context);
    const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
    const t = context.shared.time.elapsed * 0.001;
    const delta = this.lastT > 0 ? Math.min(0.05, Math.max(0.008, t - this.lastT)) : 1 / 60;
    this.lastT = t;

    const pal = this.palette.tick(delta, punch);
    const tone = moodTone(pal.mood, hi);
    const speedScale = Math.max(0.1, Math.min(1.6, fxAmountOr(context, WARP_SPEED_PCT) / 100));

    const w = this.cssWidth;
    const h = this.cssHeight;
    if (this.stars.length === 0 || Math.abs(w - this.prevW) > 40) {
      this.buildField(110, this.style === "vortexPull");
      this.prevW = w;
    }

    this.holdSec += delta;
    if (this.holdSec >= this.nextHold || (triggers.chaosHit && this.rng() < 0.3)) {
      this.holdSec = 0;
      this.restyle();
    }

    if (triggers.chaosHit) {
      this.warpBurst = Math.min(1, this.warpBurst + 0.85);
    }
    this.warpBurst *= Math.exp(-2.6 * delta);
    this.fieldSpin += delta * m * 0.5;

    const cx = w * 0.5;
    const cy = h * 0.5;
    const maxR = Math.hypot(w, h) * 0.55;
    const baseSpeed = (0.12 + b * 0.5 + e * 0.3 + this.warpBurst * 1.4) * speedScale;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    if (this.style === "gridWarp") {
      const spokes = 14;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        this.ctx.strokeStyle = hsla(pal.a + cen * 80, tone.s * 0.6, tone.l, (0.05 + hi * 0.06) * g);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
        this.ctx.stroke();
      }
    }

    if (this.style === "novaBurst") {
      this.novaSec += delta;
      if (this.novaSec >= this.nextNova) {
        this.novaSec = 0;
        this.nextNova = Math.max(0.5, 1.6 - e * 1.1);
        for (const star of this.stars) {
          star.radius = 0.02 + this.rng() * 0.03;
          star.angle = this.rng() * Math.PI * 2;
        }
      }
    }

    for (const star of this.stars) {
      const dir = this.style === "vortexPull" ? -1 : 1;
      const advance = delta * baseSpeed * star.speed * star.depth * dir * (this.style === "novaBurst" ? 1.6 : 1);
      star.radius = Math.max(0, star.radius + advance);

      const outOfBounds = this.style === "vortexPull" ? star.radius <= 0.01 : star.radius > 1.05;
      if (outOfBounds && this.style !== "novaBurst") {
        const fresh = this.freshStar(this.style === "vortexPull");
        star.angle = fresh.angle;
        star.radius = fresh.radius;
        star.speed = fresh.speed;
        star.depth = fresh.depth;
        star.hueSeed = fresh.hueSeed;
      } else if (this.style === "novaBurst" && star.radius > 1.05) {
        continue;
      }

      const r = star.radius * maxR;
      const wobble = this.style === "driftField" ? Math.sin(t * 0.4 + star.angle * 3) * 0.02 : 0;
      const angle = star.angle + wobble + this.fieldSpin;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      const streakLen = (6 + baseSpeed * 220 * star.depth) * (this.style === "driftField" ? 0.35 : 1);
      const px = x - Math.cos(angle) * streakLen * dir;
      const py = y - Math.sin(angle) * streakLen * dir;

      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase + t * (3 + hi * 8));
      const edgeFade = this.style === "vortexPull" ? star.radius : Math.min(1, star.radius * 1.4);
      const alpha = Math.min(1, (0.15 + edgeFade * 0.55 + twinkle * 0.25 * hi) * star.depth) * g;
      const hue = pal.accent + star.hueSeed + cen * 100 + t * 4;

      this.ctx.strokeStyle = hsla(hue, 90, tone.l + 25, alpha);
      this.ctx.lineWidth = Math.max(0.6, 1.2 * star.depth + this.warpBurst * 1.5);
      this.ctx.beginPath();
      this.ctx.moveTo(px, py);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();

      if (star.depth > 0.7) {
        this.ctx.fillStyle = hsla(hue, 70, 90, alpha * 0.8);
        this.ctx.beginPath();
        this.ctx.arc(x, y, 1.2 + this.warpBurst, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    if (triggers.chaosHit || triggers.beat) {
      const flash = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * (0.15 + this.warpBurst * 0.2));
      flash.addColorStop(0, hsla(pal.accent + cen * 100, 95, 80, (0.3 + this.warpBurst * 0.4 + punch * 0.2) * g));
      flash.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = flash;
      this.ctx.fillRect(0, 0, w, h);
    }

    this.ctx.globalCompositeOperation = "source-over";
  }
}
