/** Song / global intensity. `inherit` only valid on song override. */
export type AtmosphereFxMode = "inherit" | "off" | "subtle" | "normal" | "strong";

export type AtmosphereFxIntensity = "subtle" | "normal" | "strong";

export type AtmosphereFxCategory =
  | "glow"
  | "vignette"
  | "bars"
  | "radial"
  | "color"
  | "sonar"
  | "glitch"
  | "shatter"
  | "laser"
  | "glyph"
  | "firefly"
  | "warp";

export type AtmosphereFxPresetStatus = "draft" | "reviewed" | "published" | "disabled";

export type AtmosphereFxPresetDef = {
  id: string;
  name: string;
  description: string;
  /** Theatre animation registry id driven by the controller RAF. */
  animationId: string;
  author: string;
  source: "platform" | "community" | "admin";
  status: AtmosphereFxPresetStatus;
  category: AtmosphereFxCategory;
  defaultIntensity: AtmosphereFxIntensity;
  /** Relative GPU/CPU cost hint for policy (1 = light, 3 = heavy). */
  performanceCost: 1 | 2 | 3;
  reducedMotionSafe: boolean;
  mobileSafe: boolean;
  adminFeatured?: boolean;
  /** Floor for the rotation engine's random 0-100 fxAmount pick. Most scenes
   * are tuned in the 45-100 range so the generic floor works fine, but a few
   * (e.g. Bars, Vignette) have a deliberately low/subtle tuned default that
   * the generic floor would always override upward — set a lower floor for
   * those so the rotation engine can still land near their intended look. */
  minAmountPct?: number;
};

/** Persisted song-level override (Recording). */
export type SongAtmosphereFx = {
  mode: AtmosphereFxMode;
  presetId: string | null;
};

/** Final resolved config for the theatre post-FX layer. */
export type ResolvedAtmosphereFx = {
  active: false;
  reason: "global-off" | "song-off" | "unavailable" | "policy";
} | {
  active: true;
  presetId: string;
  animationId: string;
  intensity: AtmosphereFxIntensity;
  intensityGain: number;
  /** 0-100 per-scene fx amount override, set by the rotation engine's pick. */
  fxAmount?: number;
};
