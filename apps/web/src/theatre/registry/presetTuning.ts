import type { AudioSensitivity } from './scenePresets'
import type { RotationOverride } from '../rotation/types'

/** Global timedMusicAware defaults — slightly slower than the original 30/60/120 pass. */
export const ROTATION_HOLD_DEFAULT: RotationOverride = {
  minHoldMs: 5_000,
  targetHoldMs: 20_000,
  maxHoldMs: 50_000,
}

/** Flagship canvas scenes — linger longer; worth the hold. */
export const ROTATION_HOLD_FLAGSHIP: RotationOverride = {
  minHoldMs: 60_000,
  targetHoldMs: 120_000,
  maxHoldMs: 180_000,
}

/** Lab / novelty scenes — rotate sooner. */
export const ROTATION_HOLD_LAB: RotationOverride = {
  minHoldMs: 10_000,
  targetHoldMs: 60_000,
  maxHoldMs: 90_000,
}

/** Calm backgrounds and song-safe visuals. */
export const ROTATION_HOLD_CALM: RotationOverride = {
  minHoldMs: 10_000,
  targetHoldMs: 30_000,
  maxHoldMs: 100_000,
}

export const FAMILY_WEIGHT_FLAGSHIP = 4
export const FAMILY_WEIGHT_STRONG = 3
export const FAMILY_WEIGHT_STANDARD = 2
export const FAMILY_WEIGHT_LAB = 1

export const PRESET_WEIGHT_FLAGSHIP = 4
export const PRESET_WEIGHT_STRONG = 3
export const PRESET_WEIGHT_STANDARD = 2
export const PRESET_WEIGHT_OCCASIONAL = 1

export const TAGS_FLAGSHIP = ['canvas', 'flagship', 'audio-reactive', 'production'] as const
export const TAGS_STRONG = ['canvas', 'audio-reactive', 'production'] as const
export const TAGS_CALM = ['canvas', 'calm', 'background', 'low-motion'] as const
export const TAGS_LAB = ['canvas', 'lab', 'experimental'] as const
export const TAGS_VIDEO = ['video', 'full-bleed', 'low-motion'] as const
export const TAGS_CHARACTER = ['canvas', 'character', 'lab'] as const

export const AUDIO_VIVID: AudioSensitivity = 'vivid'
export const AUDIO_TAME: AudioSensitivity = 'tame'
export const AUDIO_CHAOS: AudioSensitivity = 'chaos'
