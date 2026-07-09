import {
  DEFAULT_ATMOSPHERE_FX_PRESET_ID,
  getAtmosphereFxPreset,
  isPublishedAtmosphereFxPreset,
} from "./catalog";
import type {
  AtmosphereFxGlobalMode,
  AtmosphereFxIntensity,
  AtmosphereFxMode,
  ResolvedAtmosphereFx,
  SongAtmosphereFx,
} from "./types";

const INTENSITY_GAIN: Record<AtmosphereFxIntensity, number> = {
  subtle: 0.45,
  normal: 0.75,
  strong: 1,
};

export type ResolveAtmosphereFxInput = {
  /** Global user pref. Off always wins and must mean zero runtime cost. */
  globalMode: AtmosphereFxGlobalMode;
  globalPresetId: string | null;
  /** Song / recording override. */
  song: SongAtmosphereFx | null | undefined;
  /** Theatre FX master toggle. */
  theatreFxEnabled: boolean;
  reducedMotion: boolean;
  lowPower: boolean;
};

function asIntensity(mode: AtmosphereFxMode | AtmosphereFxGlobalMode): AtmosphereFxIntensity | null {
  if (mode === "subtle" || mode === "normal" || mode === "strong") return mode;
  return null;
}

/**
 * Resolve one final atmosphere config.
 * Priority: global off → theatre off → song off → policy → published preset + intensity.
 */
export function resolveAtmosphereFx(input: ResolveAtmosphereFxInput): ResolvedAtmosphereFx {
  if (input.globalMode === "off") {
    return { active: false, reason: "global-off" };
  }
  if (!input.theatreFxEnabled) {
    return { active: false, reason: "theatre-off" };
  }

  const songMode = input.song?.mode ?? "inherit";
  if (songMode === "off") {
    return { active: false, reason: "song-off" };
  }

  if (input.lowPower) {
    return { active: false, reason: "policy" };
  }

  const songPresetId = input.song?.presetId ?? null;
  const presetId =
    (songPresetId && isPublishedAtmosphereFxPreset(songPresetId) ? songPresetId : null)
    ?? (input.globalPresetId && isPublishedAtmosphereFxPreset(input.globalPresetId)
      ? input.globalPresetId
      : null)
    ?? DEFAULT_ATMOSPHERE_FX_PRESET_ID;

  const preset = getAtmosphereFxPreset(presetId);
  if (!preset || preset.status !== "published") {
    return { active: false, reason: "unavailable" };
  }

  if (input.reducedMotion && !preset.reducedMotionSafe) {
    return { active: false, reason: "policy" };
  }

  let intensity: AtmosphereFxIntensity =
    asIntensity(songMode) ?? asIntensity(input.globalMode) ?? preset.defaultIntensity;

  if (input.reducedMotion && intensity === "strong") {
    intensity = "subtle";
  }

  if (preset.performanceCost >= 3 && intensity === "strong") {
    intensity = "normal";
  }

  return {
    active: true,
    presetId: preset.id,
    animationId: preset.animationId,
    intensity,
    intensityGain: INTENSITY_GAIN[intensity],
  };
}
