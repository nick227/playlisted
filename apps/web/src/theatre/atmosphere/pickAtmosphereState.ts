import { getAtmosphereFxPreset, listAtmosphereFxPresets } from "./catalog";
import { ATMOSPHERE_ROTATION_FREQUENCY_PCT } from "./atmosphereRotationTiming";
import type { AtmosphereFxIntensity } from "./types";

/** Default floor when a preset doesn't specify its own minAmountPct. */
const GENERIC_AMOUNT_FLOOR = 20;
/** How much live audio energy can add on top of the floor, at most. */
const ENERGY_RANGE = 20;

export type AtmospherePick = {
  /** null = this rotation cycle picked "nothing playing." */
  presetId: string | null;
  intensity: AtmosphereFxIntensity;
  /** 0-100, snapshotted once per pick — not a live-updating value. */
  fxAmount: number;
};

export type PickAtmosphereStateInput = {
  /** Avoid picking the same preset twice in a row. */
  excludePresetId?: string | null;
  /** 0-1ish live audio energy (env/rms) read at pick time. */
  audioEnergy: number;
  reducedMotion: boolean;
  /** 0-100 probability of showing anything this rotation. Defaults to the
   * site constant; 0 = never, 100 = always — a hard developer-set ceiling
   * that audio/randomness nudge nothing outside of. */
  frequencyPct?: number;
  /** Defaults to Math.random, same convention as atmosphereMood.ts. */
  rng?: () => number;
};

function weightedPick<T>(items: Array<{ value: T; weight: number }>, rng: () => number): T {
  if (items.length === 0) {
    throw new Error("weightedPick called with no candidates");
  }
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1]!.value;
}

export function pickNextAtmosphereState(input: PickAtmosphereStateInput): AtmospherePick {
  const rng = input.rng ?? Math.random;
  const energy = Math.max(0, Math.min(1, input.audioEnergy));
  const frequency = Math.max(0, Math.min(100, input.frequencyPct ?? ATMOSPHERE_ROTATION_FREQUENCY_PCT));

  const published = listAtmosphereFxPresets();
  const eligible = published.filter((preset) => !input.reducedMotion || preset.reducedMotionSafe);
  const candidates = eligible.length > 1
    ? eligible.filter((preset) => preset.id !== input.excludePresetId)
    : eligible;

  // Hard probability gate — frequency=0 can never show, frequency=100 always
  // shows. Nothing else (audio, randomness) is allowed to push outside that.
  const showsSomething = candidates.length > 0 && rng() * 100 < frequency;
  const presetId = showsSomething
    ? weightedPick<string | null>(candidates.map((preset) => ({ value: preset.id as string | null, weight: 1 })), rng)
    : null;

  const intensity = weightedPick<AtmosphereFxIntensity>(
    [
      { value: "subtle", weight: 0.35 - energy * 0.15 },
      { value: "normal", weight: 0.4 },
      { value: "strong", weight: 0.25 + energy * 0.15 },
    ],
    rng,
  );

  // Most scenes are tuned in the 45-100 range so the generic floor fits fine,
  // but a few (Bars, Vignette) have a deliberately low/subtle tuned default
  // that the generic floor would always override upward — respect the
  // chosen preset's own floor when it sets one.
  const chosenPreset = presetId ? getAtmosphereFxPreset(presetId) : null;
  const amountFloor = chosenPreset?.minAmountPct ?? GENERIC_AMOUNT_FLOOR;
  const rngRange = Math.max(0, 100 - amountFloor - ENERGY_RANGE);
  const fxAmount = Math.max(0, Math.min(100, amountFloor + rng() * rngRange + energy * ENERGY_RANGE));

  return { presetId, intensity, fxAmount };
}
