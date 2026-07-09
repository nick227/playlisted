import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import {
  bass,
  beatPunch,
  centroid,
  env,
  fluxBass,
  fluxHigh,
  fluxMid,
  high,
  intensityGain,
  mid,
} from "./audio";
import { hsla, moodTone, ShiftingMoodPalette } from "./atmosphereMood";

type GlitchStyle = "vhsRoll" | "dataMosh" | "rgbSplit" | "scanBurst" | "signalDrop";

const STYLES: GlitchStyle[] = ["vhsRoll", "dataMosh", "rgbSplit", "scanBurst", "signalDrop"];

/** Signal-corruption amount — tear frequency, channel divergence, and grain. */
export const GLITCH_INTENSITY_PCT = 45;

/** Hard ceiling on how opaque the overlay can ever get, independent of internal
 * buffer buildup — this is a translucent effect over the theatre, never a
 * replacement for it. */
const MAX_SCREEN_ALPHA = 0.62;

/** Internal render buffer is capped and upscaled — cheap true-channel isolation
 * at any output resolution, and the slight softness from upscaling reads as
 * analog signal loss rather than a downscale artifact. */
const INTERNAL_MAX_W = 480;

function createSeededRng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type TearBand = "bass" | "mid" | "high";

type Tear = {
  y: number;
  height: number;
  life: number;
  offsetX: number;
  band: TearBand;
};

/**
 * Broken-signal FX, built like a real analog/digital corruption pipeline
 * rather than colored rectangles:
 *  1. A persistence buffer accumulates the signal frame over frame (decayed,
 *     not cleared), so slice-tears displace *actual* prior content — real
 *     video-feedback smear, not a faked shape.
 *  2. The composited buffer is split into true R/G/B channels via
 *     multiply-isolation (draw + multiply by a pure channel color), then
 *     recombined additively with independent per-channel offsets — genuine
 *     chromatic divergence, not a tinted duplicate.
 *  3. Each channel's divergence is driven by *its own* frequency band's
 *     onset flux (red desyncs on bass hits, blue on high transients, green
 *     stays the anchor) — the color break-up literally maps to the mix.
 *  4. Finished with procedural grain, a head-switch noise bar, blur-bloom,
 *     and a vignette so it reads as a shot, not an overlay.
 */
export class AtmosphereGlitchScene extends CanvasAnimation {
  private palette = new ShiftingMoodPalette();
  private rng = createSeededRng((Math.random() * 1e9) | 0);
  private style: GlitchStyle = "rgbSplit";
  private holdSec = 0;
  private nextHold = 6;
  private lastT = 0;

  private bufW = 0;
  private bufH = 0;
  private feedback!: HTMLCanvasElement;
  private feedbackCtx!: CanvasRenderingContext2D;
  private chanR!: HTMLCanvasElement;
  private chanRCtx!: CanvasRenderingContext2D;
  private chanG!: HTMLCanvasElement;
  private chanGCtx!: CanvasRenderingContext2D;
  private chanB!: HTMLCanvasElement;
  private chanBCtx!: CanvasRenderingContext2D;
  private noiseTile!: HTMLCanvasElement;
  private noiseCtx!: CanvasRenderingContext2D;
  private noiseReady = false;
  private noiseAge = 0;

  private tears: Tear[] = [];
  private prevFluxBass = 0;
  private prevFluxMid = 0;
  private prevFluxHigh = 0;
  private desyncR = 0;
  private desyncG = 0;
  private desyncB = 0;
  private rollY = 0;
  private dropoutSec = 0;
  private resyncFlash = 0;

  private restyle() {
    this.style = STYLES[Math.floor(this.rng() * STYLES.length)]!;
    this.nextHold = 5 + this.rng() * 8;
  }

  private ensureBuffers(cssW: number, cssH: number) {
    if (!this.noiseReady) {
      this.noiseTile = document.createElement("canvas");
      this.noiseTile.width = 96;
      this.noiseTile.height = 96;
      this.noiseCtx = this.noiseTile.getContext("2d")!;
      this.noiseReady = true;
      this.refreshNoise();
    }

    const scale = Math.min(1, INTERNAL_MAX_W / Math.max(1, cssW));
    const w = Math.max(120, Math.round(cssW * scale));
    const h = Math.max(80, Math.round(cssH * scale));
    if (w === this.bufW && h === this.bufH) return;
    this.bufW = w;
    this.bufH = h;

    this.feedback = document.createElement("canvas");
    this.feedback.width = w;
    this.feedback.height = h;
    this.feedbackCtx = this.feedback.getContext("2d")!;
    this.feedbackCtx.fillStyle = "#020204";
    this.feedbackCtx.fillRect(0, 0, w, h);

    this.chanR = document.createElement("canvas");
    this.chanR.width = w;
    this.chanR.height = h;
    this.chanRCtx = this.chanR.getContext("2d")!;

    this.chanG = document.createElement("canvas");
    this.chanG.width = w;
    this.chanG.height = h;
    this.chanGCtx = this.chanG.getContext("2d")!;

    this.chanB = document.createElement("canvas");
    this.chanB.width = w;
    this.chanB.height = h;
    this.chanBCtx = this.chanB.getContext("2d")!;
  }

  private refreshNoise() {
    const w = this.noiseTile.width;
    const h = this.noiseTile.height;
    const imgData = this.noiseCtx.createImageData(w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = (this.rng() * 255) | 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = (this.rng() * 70) | 0;
    }
    this.noiseCtx.putImageData(imgData, 0, 0);
  }

  private spawnTear(band: TearBand, strength: number, intensity: number) {
    const heightBase = band === "bass" ? 0.06 : band === "mid" ? 0.032 : 0.014;
    this.tears.push({
      y: this.rng() * this.bufH,
      height: Math.max(1, this.bufH * heightBase * (0.6 + this.rng() * 0.8) * (0.5 + intensity)),
      life: 1,
      offsetX: (this.rng() - 0.5) * this.bufW * 0.22 * (0.4 + intensity) * (0.6 + strength),
      band,
    });
    if (this.tears.length > 18) this.tears.shift();
  }

  /** Isolate one true channel from the composited signal via multiply, not a tint. */
  private isolateChannel(chanCtx: CanvasRenderingContext2D, channelColor: string) {
    const w = this.bufW;
    const h = this.bufH;
    chanCtx.globalCompositeOperation = "source-over";
    chanCtx.clearRect(0, 0, w, h);
    chanCtx.drawImage(this.feedback, 0, 0);
    chanCtx.globalCompositeOperation = "multiply";
    chanCtx.fillStyle = channelColor;
    chanCtx.fillRect(0, 0, w, h);
    chanCtx.globalCompositeOperation = "source-over";
  }

  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.05, env(context));
    const b = bass(context);
    const m = mid(context);
    const hi = high(context);
    const cen = centroid(context);
    const punch = beatPunch(context);
    const fb = fluxBass(context);
    const fm = fluxMid(context);
    const fh = fluxHigh(context);
    const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
    const t = context.shared.time.elapsed * 0.001;
    const delta = this.lastT > 0 ? Math.min(0.05, Math.max(0.008, t - this.lastT)) : 1 / 60;
    this.lastT = t;

    const pal = this.palette.tick(delta, punch);
    const tone = moodTone(pal.mood, hi);
    const intensity = Math.max(0, Math.min(1, GLITCH_INTENSITY_PCT / 100));

    const w = this.cssWidth;
    const h = this.cssHeight;
    this.ensureBuffers(w, h);
    const bw = this.bufW;
    const bh = this.bufH;

    this.holdSec += delta;
    if (this.holdSec >= this.nextHold || (triggers.chaosHit && this.rng() < 0.4)) {
      this.holdSec = 0;
      this.restyle();
    }

    this.noiseAge += delta;
    if (this.noiseAge > 0.08) {
      this.noiseAge = 0;
      this.refreshNoise();
    }

    // Each band tears its own row AND desyncs its own color channel.
    if (fb - this.prevFluxBass > 0.05 * (1.2 - intensity)) {
      this.spawnTear("bass", b, intensity);
      this.desyncR = Math.min(1, this.desyncR + 0.6 + b * 0.4);
    }
    if (fm - this.prevFluxMid > 0.05 * (1.2 - intensity)) {
      this.spawnTear("mid", m, intensity);
      this.desyncG = Math.min(1, this.desyncG + 0.3 + m * 0.25);
    }
    if (fh - this.prevFluxHigh > 0.045 * (1.2 - intensity)) {
      this.spawnTear("high", hi, intensity);
      this.desyncB = Math.min(1, this.desyncB + 0.6 + hi * 0.4);
    }
    this.prevFluxBass = fb;
    this.prevFluxMid = fm;
    this.prevFluxHigh = fh;

    if (triggers.chaosHit) {
      for (let i = 0; i < 3; i++) this.spawnTear(i % 2 === 0 ? "bass" : "high", 0.85, intensity);
      this.dropoutSec = 0.1 + this.rng() * 0.08;
      this.desyncR = 1;
      this.desyncB = 1;
    }
    this.dropoutSec = Math.max(0, this.dropoutSec - delta);

    this.desyncR *= Math.exp(-3.2 * delta);
    this.desyncG *= Math.exp(-3.6 * delta);
    this.desyncB *= Math.exp(-3 * delta);

    if (triggers.beat || punch > 0.6) this.resyncFlash = Math.min(1, this.resyncFlash + 0.5);
    this.resyncFlash *= Math.exp(-4 * delta);

    this.rollY = (this.rollY + delta * (18 + e * 160)) % (bh + bh * 0.12 * 2);

    const liveTears: Tear[] = [];
    for (const tear of this.tears) {
      tear.life -= delta * (2.4 + (tear.band === "high" ? 2.6 : tear.band === "mid" ? 1.5 : 0.8));
      if (tear.life > 0) liveTears.push(tear);
    }
    this.tears = liveTears;

    // ---- Build the signal into the persistence buffer (decayed, never cleared) ----
    // Decay must remove alpha (destination-out), not paint opaque black over it
    // (source-over) — repeated source-over fills compound toward alpha=1, which
    // then reads as a solid opaque rectangle sitting over the theatre no matter
    // how dark the color is. Fading toward transparent lets idle regions show
    // the theatre through, and only actual glitch content stays opaque.
    const fctx = this.feedbackCtx;
    fctx.globalCompositeOperation = "destination-out";
    fctx.fillStyle = `rgba(0,0,0,${0.42 + e * 0.18})`;
    fctx.fillRect(0, 0, bw, bh);

    fctx.globalCompositeOperation = "lighter";
    const wash = fctx.createRadialGradient(bw * 0.5, bh * 0.5, 0, bw * 0.5, bh * 0.5, Math.max(bw, bh) * 0.75);
    wash.addColorStop(0, hsla(pal.a, tone.s, tone.l, (0.05 + e * 0.08) * g));
    wash.addColorStop(1, "hsla(0,0%,0%,0)");
    fctx.fillStyle = wash;
    fctx.fillRect(0, 0, bw, bh);

    fctx.fillStyle = hsla(pal.b, tone.s * 0.4, 10, (0.05 + e * 0.05) * g);
    for (let y = 0; y < bh; y += 3) fctx.fillRect(0, y, bw, 1);

    if (this.style === "vhsRoll") {
      const bandH = bh * 0.06;
      const ry = (this.rollY % (bh + bandH * 2)) - bandH;
      const grad = fctx.createLinearGradient(0, ry - bandH, 0, ry + bandH);
      grad.addColorStop(0, "hsla(0,0%,0%,0)");
      grad.addColorStop(0.5, hsla(pal.accent, 90, tone.l + 20, (0.22 + e * 0.2) * g));
      grad.addColorStop(1, "hsla(0,0%,0%,0)");
      fctx.fillStyle = grad;
      fctx.fillRect(0, ry - bandH, bw, bandH * 2);
      for (let i = 0; i < 5; i++) {
        const ly = ry - bandH + (i / 5) * bandH * 2;
        const wobble = Math.sin(t * 20 + i * 2) * bw * 0.02 * (0.4 + hi);
        fctx.strokeStyle = hsla(pal.b, 85, tone.l + 15, (0.14 + hi * 0.2) * g);
        fctx.lineWidth = 1.2;
        fctx.beginPath();
        fctx.moveTo(0, ly);
        fctx.lineTo(bw * 0.5 + wobble, ly);
        fctx.lineTo(bw, ly - wobble * 0.5);
        fctx.stroke();
      }
    }

    if (this.style === "scanBurst") {
      const bursts = Math.floor(2 + hi * 14);
      for (let i = 0; i < bursts; i++) {
        const y = this.rng() * bh;
        fctx.fillStyle = hsla(pal.accent, 95, 75, (0.16 + hi * 0.35) * g);
        fctx.fillRect(0, y, bw, 1 + this.rng() * 2);
      }
    }

    // Recursive persistence smear — the buffer drags a faint copy of itself.
    if (this.style === "dataMosh") {
      const dx = Math.sin(t * 0.7) * bw * 0.012 * (0.4 + intensity);
      fctx.globalAlpha = 0.5;
      fctx.drawImage(this.feedback, dx, 0);
      fctx.globalAlpha = 1;
    }

    // Self-referential slice tears — displace the *real* accumulated signal.
    fctx.globalCompositeOperation = "source-over";
    for (const tear of this.tears) {
      const sh = Math.max(1, Math.min(bh, tear.height));
      const sy = Math.max(0, Math.min(bh - sh, tear.y));
      fctx.drawImage(this.feedback, 0, sy, bw, sh, tear.offsetX, sy, bw, sh);
    }

    if (this.style === "signalDrop" && this.dropoutSec > 0) {
      const jump = (this.rng() - 0.5) * bw * 0.22;
      fctx.drawImage(this.feedback, jump, (this.rng() - 0.5) * 4);
      const bars = 1 + Math.floor(this.rng() * 2);
      for (let i = 0; i < bars; i++) {
        const y = this.rng() * bh;
        fctx.fillStyle = "rgba(0,0,0,0.75)";
        fctx.fillRect(0, y, bw, bh * (0.02 + this.rng() * 0.05));
      }
    }

    const pattern = fctx.createPattern(this.noiseTile, "repeat");
    if (pattern) {
      fctx.globalCompositeOperation = "overlay";
      fctx.globalAlpha = 0.08 + hi * 0.08;
      fctx.fillStyle = pattern;
      fctx.fillRect(0, 0, bw, bh);
      fctx.globalAlpha = 1;
    }

    // Head-switch noise bar — classic VHS bottom-of-frame tape artifact.
    fctx.globalCompositeOperation = "source-over";
    const hsH = bh * 0.025;
    fctx.fillStyle = `rgba(230,230,235,${0.1 + hi * 0.2})`;
    for (let x = 0; x < bw; x += 3) {
      if (this.rng() < 0.5) fctx.fillRect(x, bh - hsH, 2, hsH * this.rng());
    }

    // ---- True channel isolation (multiply, not tint) then additive recombine ----
    this.isolateChannel(this.chanRCtx, "rgb(255,40,60)");
    this.isolateChannel(this.chanGCtx, "rgb(40,255,120)");
    this.isolateChannel(this.chanBCtx, "rgb(60,120,255)");

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalCompositeOperation = "lighter";

    const baseSplit = (2 + intensity * 10) * g;
    const styleMul = this.style === "rgbSplit" ? 1.9 : this.style === "signalDrop" ? 1.3 : 1;
    const rOff = baseSplit * (0.3 + this.desyncR * 1.6) * styleMul;
    const gOff = baseSplit * 0.15 * (0.2 + this.desyncG * 0.8);
    const bOff = -baseSplit * (0.3 + this.desyncB * 1.6) * styleMul;

    // Hard ceiling on screen alpha regardless of how opaque the internal buffer
    // gets — this is a translucent overlay, never allowed to fully occlude.
    this.ctx.globalAlpha = MAX_SCREEN_ALPHA;
    this.ctx.drawImage(this.chanR, 0, 0, bw, bh, rOff, 0, w, h);
    this.ctx.drawImage(this.chanG, 0, 0, bw, bh, gOff, 0, w, h);
    this.ctx.drawImage(this.chanB, 0, 0, bw, bh, bOff, 0, w, h);
    this.ctx.globalAlpha = 1;

    // Soft bloom — blurred additive re-pass of the recombined signal.
    this.ctx.filter = "blur(6px)";
    this.ctx.globalAlpha = (0.16 + punch * 0.12) * MAX_SCREEN_ALPHA;
    this.ctx.drawImage(this.feedback, 0, 0, bw, bh, 0, 0, w, h);
    this.ctx.globalAlpha = 1;
    this.ctx.filter = "none";

    this.ctx.globalCompositeOperation = "source-over";

    // Vignette intensifies with energy (not silence) and stays subtle — this
    // frames the shot, it doesn't dim the theatre underneath.
    const vig = this.ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.4, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    vig.addColorStop(0, "hsla(0,0%,0%,0)");
    vig.addColorStop(1, `hsla(0,0%,0%,${(0.06 + e * 0.09) * MAX_SCREEN_ALPHA})`);
    this.ctx.fillStyle = vig;
    this.ctx.fillRect(0, 0, w, h);

    if (this.resyncFlash > 0.05) {
      this.ctx.globalCompositeOperation = "lighter";
      this.ctx.fillStyle = hsla(pal.accent + cen * 40, 90, 80, this.resyncFlash * 0.18 * g);
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.globalCompositeOperation = "source-over";
    }
  }
}
