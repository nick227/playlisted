import type { PublicAnimationContext } from "../../author/types";

export function intensityGain(context: PublicAnimationContext): number {
  const raw = context.options.intensity;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.min(1.5, raw)) : 0.75;
}

export function env(context: PublicAnimationContext): number {
  return context.shared.features?.env ?? 0;
}

export function rms(context: PublicAnimationContext): number {
  return context.shared.features?.rms ?? 0;
}

export function bass(context: PublicAnimationContext): number {
  return context.shared.features?.bandEnv?.bass ?? context.shared.features?.bands?.bass ?? 0;
}

export function mid(context: PublicAnimationContext): number {
  return context.shared.features?.bandEnv?.mids ?? context.shared.features?.bands?.mids ?? 0;
}

export function high(context: PublicAnimationContext): number {
  return context.shared.features?.bandEnv?.highs ?? context.shared.features?.bands?.highs ?? 0;
}

export function flux(context: PublicAnimationContext): number {
  return context.shared.features?.flux?.overall ?? 0;
}

export function centroid(context: PublicAnimationContext): number {
  return context.shared.features?.centroid ?? 0.5;
}

export function beatPunch(context: PublicAnimationContext): number {
  const t = context.shared.getTriggers(context.options.preset ?? "vivid");
  return (t.beat ? 1 : 0) + (t.bassHit ? 0.7 : 0) + (t.chaosHit ? 1.2 : 0);
}

export function spectrumProxy(context: PublicAnimationContext, count: number): number[] {
  const b = Math.max(0.05, bass(context));
  const m = Math.max(0.05, mid(context));
  const h = Math.max(0.05, high(context));
  const e = Math.max(0.05, env(context));
  const r = Math.max(0.05, rms(context));
  const f = Math.max(0.02, flux(context));
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const low = b * (1 - t) * (1 - t);
    const midBand = m * Math.sin(Math.PI * t);
    const hi = h * t * t;
    const shimmer = Math.sin(i * 1.7 + e * 8) * 0.08 * f;
    out.push(Math.min(1.2, low * 1.1 + midBand * 0.95 + hi * 1.05 + e * 0.15 + r * 0.1 + shimmer));
  }
  return out;
}

export function hueFromAudio(context: PublicAnimationContext, base = 0): number {
  return (base + bass(context) * 35 + mid(context) * 110 + high(context) * 200 + centroid(context) * 90 + context.shared.time.elapsed * 0.012) % 360;
}
