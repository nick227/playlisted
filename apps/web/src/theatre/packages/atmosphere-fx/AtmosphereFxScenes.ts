import { CanvasAnimation } from "../../core/CanvasAnimation";
import type { PublicAnimationContext } from "../../author/types";
import type { AnimationFactory } from "../../core/IAnimation";

function intensityGain(context: PublicAnimationContext): number {
  const raw = context.options.intensity;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.min(1.5, raw)) : 0.75;
}

function env(context: PublicAnimationContext): number {
  return context.shared.features?.env ?? 0;
}

function rms(context: PublicAnimationContext): number {
  return context.shared.features?.rms ?? 0;
}

function bass(context: PublicAnimationContext): number {
  return context.shared.features?.bandEnv?.bass ?? context.shared.features?.bands?.bass ?? 0;
}

function mid(context: PublicAnimationContext): number {
  return context.shared.features?.bandEnv?.mids ?? context.shared.features?.bands?.mids ?? 0;
}

function high(context: PublicAnimationContext): number {
  return context.shared.features?.bandEnv?.highs ?? context.shared.features?.bands?.highs ?? 0;
}

class AtmosphereGlowScene extends CanvasAnimation {
  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = env(context);
    const b = bass(context);
    const w = this.cssWidth;
    const h = this.cssHeight;
    const alpha = (0.08 + e * 0.22 + b * 0.12) * g;
    const hue = (context.shared.time.elapsed * 0.02 + mid(context) * 80) % 360;
    this.ctx.clearRect(0, 0, w, h);
    const grad = this.ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    grad.addColorStop(0, `hsla(${hue}, 70%, 55%, ${alpha})`);
    grad.addColorStop(0.55, `hsla(${(hue + 40) % 360}, 60%, 40%, ${alpha * 0.35})`);
    grad.addColorStop(1, "hsla(0, 0%, 0%, 0)");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }
}

class AtmosphereVignetteScene extends CanvasAnimation {
  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = env(context);
    const drop = context.shared.getTriggers("vivid").chaosHit || context.shared.getTriggers("vivid").beat ? 1 : 0;
    const w = this.cssWidth;
    const h = this.cssHeight;
    const strength = (0.35 + e * 0.35 + drop * 0.25) * g;
    this.ctx.clearRect(0, 0, w, h);
    const grad = this.ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.55, `rgba(0,0,0,${strength * 0.15})`);
    grad.addColorStop(1, `rgba(0,0,0,${strength * 0.85})`);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }
}

class AtmosphereBarsScene extends CanvasAnimation {
  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const bands = [
      bass(context),
      mid(context),
      high(context),
      rms(context),
      env(context),
    ];
    const w = this.cssWidth;
    const h = this.cssHeight;
    const barW = Math.max(4, w * 0.012);
    const gap = barW * 0.6;
    const total = bands.length * barW + (bands.length - 1) * gap;
    const x0 = (w - total) / 2;
    const maxH = h * 0.18 * g;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = `rgba(255,255,255,${0.35 * g})`;
    for (let i = 0; i < bands.length; i++) {
      const bh = Math.max(2, bands[i]! * maxH);
      const x = x0 + i * (barW + gap);
      this.ctx.fillRect(x, h - bh - h * 0.04, barW, bh);
    }
  }
}

class AtmosphereRadialScene extends CanvasAnimation {
  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = env(context);
    const b = bass(context);
    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * (0.12 + e * 0.28 + b * 0.12) * g;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255,255,255,${(0.2 + e * 0.45) * g})`;
    this.ctx.lineWidth = 2 + e * 4 * g;
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(180,220,255,${(0.12 + b * 0.35) * g})`;
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
  }
}

class AtmosphereColorWashScene extends CanvasAnimation {
  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = env(context);
    const hue = (bass(context) * 40 + mid(context) * 120 + high(context) * 200 + context.shared.time.elapsed * 0.015) % 360;
    const w = this.cssWidth;
    const h = this.cssHeight;
    const alpha = (0.06 + e * 0.16) * g;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = `hsla(${hue}, 65%, 45%, ${alpha})`;
    this.ctx.fillRect(0, 0, w, h);
  }
}

function factory(Ctor: new () => CanvasAnimation): AnimationFactory {
  return () => new Ctor();
}

export const atmosphereGlowFactory = factory(AtmosphereGlowScene);
export const atmosphereVignetteFactory = factory(AtmosphereVignetteScene);
export const atmosphereBarsFactory = factory(AtmosphereBarsScene);
export const atmosphereRadialFactory = factory(AtmosphereRadialScene);
export const atmosphereColorWashFactory = factory(AtmosphereColorWashScene);
