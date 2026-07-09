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
    // Idle floor so the layer is visible even before analyser warms up.
    const alpha = (0.14 + e * 0.28 + b * 0.16) * g;
    const hue = (context.shared.time.elapsed * 0.02 + mid(context) * 80) % 360;
    this.ctx.clearRect(0, 0, w, h);
    const grad = this.ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    grad.addColorStop(0, `hsla(${hue}, 75%, 58%, ${alpha})`);
    grad.addColorStop(0.5, `hsla(${(hue + 40) % 360}, 65%, 42%, ${alpha * 0.45})`);
    grad.addColorStop(1, "hsla(0, 0%, 0%, 0)");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }
}

class AtmosphereVignetteScene extends CanvasAnimation {
  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = env(context);
    const triggers = context.shared.getTriggers("vivid");
    const drop = triggers.chaosHit || triggers.beat ? 1 : 0;
    const w = this.cssWidth;
    const h = this.cssHeight;
    const strength = (0.45 + e * 0.4 + drop * 0.3) * g;
    this.ctx.clearRect(0, 0, w, h);
    const grad = this.ctx.createRadialGradient(
      w * 0.5,
      h * 0.5,
      Math.min(w, h) * 0.2,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.78,
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.5, `rgba(0,0,0,${strength * 0.2})`);
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.92, strength)})`);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }
}

class AtmosphereBarsScene extends CanvasAnimation {
  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const bands = [
      Math.max(0.08, bass(context)),
      Math.max(0.08, mid(context)),
      Math.max(0.08, high(context)),
      Math.max(0.08, rms(context)),
      Math.max(0.08, env(context)),
    ];
    const w = this.cssWidth;
    const h = this.cssHeight;
    const barW = Math.max(6, w * 0.014);
    const gap = barW * 0.7;
    const total = bands.length * barW + (bands.length - 1) * gap;
    const x0 = (w - total) / 2;
    const maxH = h * 0.22 * g;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = `rgba(255,255,255,${0.55 * g})`;
    for (let i = 0; i < bands.length; i++) {
      const bh = Math.max(4, bands[i]! * maxH);
      const x = x0 + i * (barW + gap);
      this.ctx.fillRect(x, h - bh - h * 0.05, barW, bh);
    }
  }
}

class AtmosphereRadialScene extends CanvasAnimation {
  protected draw(context: PublicAnimationContext) {
    const g = intensityGain(context);
    const e = Math.max(0.12, env(context));
    const b = bass(context);
    const w = this.cssWidth;
    const h = this.cssHeight;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * (0.14 + e * 0.3 + b * 0.14) * g;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255,255,255,${(0.35 + e * 0.45) * g})`;
    this.ctx.lineWidth = 2.5 + e * 5 * g;
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(180,220,255,${(0.2 + b * 0.4) * g})`;
    this.ctx.lineWidth = 2;
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
    const alpha = (0.12 + e * 0.2) * g;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = `hsla(${hue}, 70%, 48%, ${alpha})`;
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
