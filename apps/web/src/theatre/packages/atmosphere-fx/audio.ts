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

/**
 * Aggressive per-bar EQ driver for Bars FX.
 * Near-zero when quiet; bass/mid/high map to left/center/right with hard dynamics.
 */
export function barsSpectrum(context: PublicAnimationContext, count: number): number[] {
  const features = context.shared.features;
  const b = features?.bands?.bass ?? bass(context);
  const m = features?.bands?.mids ?? mid(context);
  const h = features?.bands?.highs ?? high(context);
  const e = env(context);
  const r = rms(context);
  const fBass = features?.flux?.bass ?? flux(context);
  const fMid = features?.flux?.mids ?? flux(context);
  const fHigh = features?.flux?.highs ?? flux(context);
  const triggers = context.shared.getTriggers(context.options.preset ?? "vivid");
  const t = context.shared.time.elapsed * 0.001;
  const out: number[] = [];

  for (let i = 0; i < count; i++) {
    const u = i / Math.max(1, count - 1);
    // Soft lobe weights: left=bass, center=mids, right=highs
    const wBass = Math.pow(1 - u, 1.65);
    const wMid = Math.sin(Math.PI * u);
    const wHigh = Math.pow(u, 1.55);
    const band =
      b * wBass * 1.55
      + m * wMid * 1.35
      + h * wHigh * 1.45;
    const fluxKick =
      fBass * wBass * 1.8
      + fMid * wMid * 1.4
      + fHigh * wHigh * 1.6;
    // Per-bar phase so neighboring bars don't move as a flat slab
    const voice = Math.sin(i * 2.17 + t * (6 + e * 10)) * 0.5 + 0.5;
    const note =
      (triggers.bassHit ? wBass * 0.85 : 0)
      + (triggers.midsHit ? wMid * 0.7 : 0)
      + (triggers.highsHit ? wHigh * 0.75 : 0)
      + (triggers.beat ? 0.35 + wBass * 0.25 : 0)
      + (triggers.chaosHit ? 0.55 : 0);

    // Expand dynamics: quiet ≈ 0, hits slam toward 1+
    const raw = band * 1.1 + fluxKick * 0.9 + e * 0.12 + r * 0.08 + note + voice * e * 0.2;
    const shaped = Math.pow(Math.max(0, raw), 0.72);
    out.push(Math.min(1.6, shaped));
  }
  return out;
}

export function hueFromAudio(context: PublicAnimationContext, base = 0): number {
  return (base + bass(context) * 35 + mid(context) * 110 + high(context) * 200 + centroid(context) * 90 + context.shared.time.elapsed * 0.012) % 360;
}
