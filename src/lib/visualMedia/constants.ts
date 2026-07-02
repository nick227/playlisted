export const WRITABLE_SONG_VISUAL_POLICIES = [
  "preferAttached",
  "attachedOnly",
  "mixAttachedAndDefault",
] as const;

export type WritableSongVisualPolicy = (typeof WRITABLE_SONG_VISUAL_POLICIES)[number];

export const BEAT_FX_INTENSITIES = ["subtle", "normal", "strong"] as const;
export const BEAT_FX_EFFECTS = ["scale", "brightness", "dropPunch"] as const;
export const PLAYBACK_OBJECT_FITS = ["cover", "contain"] as const;
export const ROTATION_MODES = ["timedMusicAware", "perTrack"] as const;
export const ROTATION_GATE_KINDS = ["beatOrChaosOrDropEdge", "beatEdge", "flux"] as const;

export const MAX_ATTACHMENT_WEIGHT = 1_000;
export const MAX_ATTACHMENT_ORDER = 100_000;
export const MAX_ATTACHMENT_LABEL_LENGTH = 191;
export const MAX_ATTACHMENT_TAGS = 32;
export const MAX_ATTACHMENT_TAG_LENGTH = 64;
export const MAX_TIMELINE_SEC = 86_400;
export const MAX_START_OFFSET_MS = 86_400_000;
export const MAX_ROTATION_HOLD_MS = 600_000;
export const MAX_PIN_PRESET_ID_LENGTH = 128;
export const MAX_MEDIA_DIMENSION_PX = 16_384;
export const MAX_MEDIA_DURATION_MS = 86_400_000;

export const VISUAL_UPLOAD_LIMITS = {
  videoBytes: 250 * 1024 * 1024,
  imageBytes: 15 * 1024 * 1024,
} as const;
