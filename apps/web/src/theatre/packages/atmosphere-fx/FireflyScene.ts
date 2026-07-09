import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import { bass, beatPunch, centroid, env, flux, fxAmountOr, high, intensityGain, mid } from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type SwarmBehavior = "driftCloud" | "spiralOrbit" | "chaosScatter" | "twinCluster" | "streamFlow";

const BEHAVIORS: SwarmBehavior[] = ["driftCloud", "spiralOrbit", "chaosScatter", "twinCluster", "streamFlow"];

/** Swarm size — number of fireflies as % of the 15-90 agent range. */
export const FIREFLY_COUNT_PCT = 60;

function createSeededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Agent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  px: number;
  py: number;
  orbitR: number;
  orbitPhase: number;
  personalAngle: number;
  bias: number;
  hueSeed: number;
  twinklePhase: number;
  twinkleRate: number;
  reroll: number;
};

/**
 * Lazy-drifting swarm of light agents that scatter outward on spectral-flux
 * transients and slowly regain cohesion — a true flocking/attractor
 * simulation (per-agent spring-to-target + drift), not a radial gradient
 * or particle burst like every other scene here.
 */
export class AtmosphereFireflyScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private rng = createSeededRng((Math.random() * 1e9) | 0);
  private agents: Agent[] = [];
  private behavior: SwarmBehavior = "driftCloud";
  private holdSec = 0;
  private nextHold = 12;
  private lastT = 0;
  private scatterKick = 0;
  private prevW = 0;
  private cloudCx = 0.5;
  private cloudCy = 0.5;
  private clusterBlend = 0;

  private buildSwarm(w: number, h: number, countPct: number) {
    const density = Math.max(0.1, Math.min(1, countPct / 100));
    const count = Math.max(12, Math.round(15 + density * 75));
    this.agents = [];
    for (let i = 0; i < count; i++) {
      const x = w * (0.2 + this.rng() * 0.6);
      const y = h * (0.25 + this.rng() * 0.5);
      this.agents.push({
        x,
        y,
        vx: 0,
        vy: 0,
        px: x,
        py: y,
        orbitR: 0.08 + this.rng() * 0.3,
        orbitPhase: this.rng() * Math.PI * 2,
        personalAngle: this.rng() * Math.PI * 2,
        bias: this.rng(),
        hueSeed: (this.rng() - 0.5) * 50,
        twinklePhase: this.rng() * Math.PI * 2,
        twinkleRate: 2 + this.rng() * 4,
        reroll: 0,
      });
    }
  }

  private restyle() {
    this.behavior = BEHAVIORS[Math.floor(this.rng() * BEHAVIORS.length)]!;
    this.nextHold = 10 + this.rng() * 14;
  }

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.05, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const cen = centroid(context);
    const fl = flux(context);
    const punch = beatPunch(context);
    const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
    const t = context.shared.time.elapsed * 0.001;
    const delta = this.lastT > 0 ? Math.min(0.05, Math.max(0.008, t - this.lastT)) : 1 / 60;
    this.lastT = t;

    const pal = this.palette.tick(delta, punch);
    const tone = moodTone(pal.mood, hi);

    const w = this.cssWidth;
    const h = this.cssHeight;
    if (this.agents.length === 0 || Math.abs(w - this.prevW) > 40) {
      this.buildSwarm(w, h, fxAmountOr(context, FIREFLY_COUNT_PCT));
      this.prevW = w;
    }

    this.holdSec += delta;
    if (this.holdSec >= this.nextHold || (triggers.chaosHit && this.rng() < 0.35)) {
      this.holdSec = 0;
      this.restyle();
    }

    // Spectral-flux transient scatters the whole swarm outward; cohesion regains after.
    if (fl > 0.09 || triggers.chaosHit) {
      this.scatterKick = Math.min(1, this.scatterKick + fl * 2 + (triggers.chaosHit ? 0.5 : 0));
    }
    this.scatterKick *= Math.exp(-1.6 * delta);

    this.cloudCx = 0.5 + Math.sin(t * 0.09) * 0.22;
    this.cloudCy = 0.42 + Math.cos(t * 0.07) * 0.16;
    this.clusterBlend = 0.5 + Math.sin(t * 0.13) * 0.5;

    const cx = this.cloudCx * w;
    const cy = this.cloudCy * h;
    const speedMul = 0.6 + m * 1.8;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    for (const agent of this.agents) {
      let targetX = cx;
      let targetY = cy;

      if (this.behavior === "driftCloud") {
        agent.personalAngle += delta * 0.25 * speedMul;
        targetX = cx + Math.cos(agent.personalAngle) * w * agent.orbitR;
        targetY = cy + Math.sin(agent.personalAngle) * h * agent.orbitR * 0.7;
      } else if (this.behavior === "spiralOrbit") {
        agent.personalAngle += delta * (0.35 + agent.orbitR) * speedMul;
        const r = agent.orbitR * Math.min(w, h) * 0.9;
        targetX = cx + Math.cos(agent.personalAngle + agent.orbitPhase) * r;
        targetY = cy + Math.sin(agent.personalAngle + agent.orbitPhase) * r;
      } else if (this.behavior === "chaosScatter") {
        agent.reroll -= delta;
        if (agent.reroll <= 0) {
          agent.orbitPhase = this.rng() * Math.PI * 2;
          agent.orbitR = 0.15 + this.rng() * 0.55;
          agent.reroll = 1.5 + this.rng() * 2.5;
        }
        targetX = w * 0.5 + Math.cos(agent.orbitPhase) * w * agent.orbitR;
        targetY = h * 0.5 + Math.sin(agent.orbitPhase) * h * agent.orbitR;
      } else if (this.behavior === "twinCluster") {
        const ax = w * 0.28;
        const ay = h * 0.4;
        const bx = w * 0.72;
        const by = h * 0.42;
        const lean = agent.bias < this.clusterBlend ? 1 : 0;
        targetX = (lean ? bx : ax) + Math.cos(agent.personalAngle) * w * agent.orbitR * 0.4;
        targetY = (lean ? by : ay) + Math.sin(agent.personalAngle) * h * agent.orbitR * 0.4;
        agent.personalAngle += delta * 0.4 * speedMul;
      } else {
        agent.personalAngle += delta * 0.3;
        const flowX = ((agent.bias + t * 0.05 * speedMul) % 1) * w;
        targetX = flowX;
        targetY = h * 0.5 + Math.sin(flowX * 0.01 + t * 0.6) * h * 0.16 + Math.sin(agent.personalAngle) * h * agent.orbitR * 0.25;
      }

      // Scatter impulse pushes agents radially away from swarm center.
      const dxs = agent.x - cx;
      const dys = agent.y - cy;
      const distS = Math.max(1, Math.hypot(dxs, dys));
      const scatterAX = (dxs / distS) * this.scatterKick * 600;
      const scatterAY = (dys / distS) * this.scatterKick * 600;

      const springK = 3.2 * (1 - this.scatterKick * 0.7);
      const ax = (targetX - agent.x) * springK + scatterAX;
      const ay = (targetY - agent.y) * springK + scatterAY;
      agent.vx = (agent.vx + ax * delta) * 0.9;
      agent.vy = (agent.vy + ay * delta) * 0.9;
      agent.px = agent.x;
      agent.py = agent.y;
      agent.x += agent.vx * delta;
      agent.y += agent.vy * delta;

      const twinkle = 0.5 + 0.5 * Math.sin(agent.twinklePhase + t * agent.twinkleRate * (0.6 + hi * 1.6));
      const bassFlash = triggers.bassHit || triggers.beat ? 0.35 + punch * 0.3 : 0;
      const alpha = (0.25 + twinkle * 0.55 + e * 0.15 + bassFlash * (0.3 + b * 0.2)) * g;
      const hue = pal.accent + agent.hueSeed + cen * 110;
      const r = 1.4 + twinkle * 2.4 + punch * 1.5;

      this.ctx.strokeStyle = hsla(hue, 85, tone.l + 15, alpha * 0.35);
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(agent.px, agent.py);
      this.ctx.lineTo(agent.x, agent.y);
      this.ctx.stroke();

      const glow = this.ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, r * 5);
      glow.addColorStop(0, hsla(hue, 95, tone.l + 30, alpha));
      glow.addColorStop(0.4, hsla(hue, 85, tone.l + 15, alpha * 0.35));
      glow.addColorStop(1, "hsla(0,0%,0%,0)");
      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(agent.x, agent.y, r * 5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = hsla(hue, 60, 95, Math.min(1, alpha * 1.4));
      this.ctx.beginPath();
      this.ctx.arc(agent.x, agent.y, r * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalCompositeOperation = "source-over";
  }
}
