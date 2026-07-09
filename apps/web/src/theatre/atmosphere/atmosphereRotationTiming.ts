/** Timing/cadence config for the Atmosphere FX auto-rotation engine. */

/**
 * 0-100 probability that a given rotation picks something to show at all.
 * 0 = never show anything, 100 = always show something, 50 = coin flip each
 * rotation. This is a straight probability scale, not a cadence knob — how
 * *often* rotations happen is governed separately by the hold durations
 * below, which stay fixed regardless of this constant.
 */
export const ATMOSPHERE_ROTATION_FREQUENCY_PCT = 10;

export const atmosphereRotationTiming = {
  /** Grace period before the engine will ever rotate away from its first pick. */
  delayMs: 25_000,
  /** Fixed hold-duration bounds for how often the engine re-rolls. */
  minHoldMs: 60_000,
  targetHoldMul: 2.0,
  maxHoldMul: 3.3,
} as const;

export type AtmosphereHoldBounds = {
  minHoldMs: number;
  targetHoldMs: number;
  maxHoldMs: number;
};

/** Fixed min/target/max hold durations — cadence is independent of frequency. */
export function computeAtmosphereHoldBounds(): AtmosphereHoldBounds {
  const { minHoldMs, targetHoldMul, maxHoldMul } = atmosphereRotationTiming;
  return {
    minHoldMs,
    targetHoldMs: minHoldMs * targetHoldMul,
    maxHoldMs: minHoldMs * maxHoldMul,
  };
}
