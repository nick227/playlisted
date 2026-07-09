import { getAtmosphereFxPreset, isPublishedAtmosphereFxPreset } from "./catalog";
import type {
  AtmosphereFxIntensity,
  AtmosphereFxMode,
  ResolvedAtmosphereFx,
  SongAtmosphereFx,
} from "./types";

const INTENSITY_GAIN: Record<AtmosphereFxIntensity, number> = {
  subtle: 0.65,
  normal: 1,
  strong: 1.35,
};

export type ResolveAtmosphereFxInput = {
  /** Site-wide hide/show. Always wins and must mean zero runtime cost. */
  hidden: boolean;
  /** Current rotation-engine pick. null = the engine picked "nothing" this cycle. */
  globalPresetId: string | null;
  globalIntensity: AtmosphereFxIntensity;
  /** 0-100 per-scene fx amount from the rotation engine's pick, if any. */
  fxAmount?: number;
  /** Song / recording override. */
  song: SongAtmosphereFx | null | undefined;
  reducedMotion: boolean;
  lowPower: boolean;
};

function asIntensity(mode: AtmosphereFxMode): AtmosphereFxIntensity | null {
  if (mode === "subtle" || mode === "normal" || mode === "strong") return mode;
  return null;
}

/**
 * Resolve one final atmosphere config.
 * Priority: hidden → song off → policy → published preset + intensity.
 * A global pick of "nothing this cycle" (globalPresetId null) does not itself
 * disable atmosphere — it only means the rotation engine has no opinion right
 * now, so a song-level override can still surface. Only `hidden` is the hard,
 * always-wins kill switch.
 */
export function resolveAtmosphereFx(input: ResolveAtmosphereFxInput): ResolvedAtmosphereFx {
  if (input.hidden) {
    return { active: false, reason: "global-off" };
  }

  const songMode = input.song?.mode ?? "inherit";
  if (songMode === "off") {
    return { active: false, reason: "song-off" };
  }

  if (input.lowPower) {
    return { active: false, reason: "policy" };
  }

  const songPresetId = input.song?.presetId ?? null;
  const songPresetActive = Boolean(songPresetId && isPublishedAtmosphereFxPreset(songPresetId));
  const presetId =
    (songPresetActive ? songPresetId : null)
    ?? (input.globalPresetId && isPublishedAtmosphereFxPreset(input.globalPresetId)
      ? input.globalPresetId
      : null);

  if (!presetId) {
    return { active: false, reason: "policy" };
  }

  const preset = getAtmosphereFxPreset(presetId);
  if (!preset || preset.status !== "published") {
    return { active: false, reason: "unavailable" };
  }

  if (input.reducedMotion && !preset.reducedMotionSafe) {
    return { active: false, reason: "policy" };
  }

  let intensity: AtmosphereFxIntensity = asIntensity(songMode) ?? input.globalIntensity;

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
    // fxAmount belongs to whichever preset the rotation engine actually picked
    // this cycle — if the song's own preset won instead, the engine's fxAmount
    // was tuned for a different (unrelated) preset and must not carry over.
    fxAmount: songPresetActive ? undefined : input.fxAmount,
  };
}
