import type { AtmosphereFxPresetDef } from "./types";

/**
 * Curated Atmosphere FX presets.
 * Compatible with future community/admin curation (status, featured, source).
 * Not part of the theatre scene rotation bag — post-FX only.
 */
export const ATMOSPHERE_FX_PRESETS: AtmosphereFxPresetDef[] = [
  {
    id: "glow",
    name: "Glow",
    description: "Volumetric aurora bloom with light shafts and drifting orbs.",
    animationId: "atmosphereGlow",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "glow",
    defaultIntensity: "normal",
    performanceCost: 2,
    reducedMotionSafe: true,
    mobileSafe: true,
    adminFeatured: true,
  },
  {
    id: "vignette",
    name: "Vignette",
    description: "Cinematic iris crush with rotating petals and chromatic rim.",
    animationId: "atmosphereVignette",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "vignette",
    defaultIntensity: "normal",
    performanceCost: 2,
    reducedMotionSafe: true,
    mobileSafe: true,
    adminFeatured: true,
  },
  {
    id: "bars",
    name: "Bars",
    description: "Bottom-anchored ghostly spectral EQ — cool cyan/violet quiet, hot magenta/gold hits.",
    animationId: "atmosphereBars",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "bars",
    defaultIntensity: "normal",
    performanceCost: 2,
    reducedMotionSafe: false,
    mobileSafe: true,
  },
  {
    id: "radial",
    name: "Radial",
    description: "Cosmic pulse engine with spiral arms, shockwaves, and spectrum ring.",
    animationId: "atmosphereRadial",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "radial",
    defaultIntensity: "normal",
    performanceCost: 3,
    reducedMotionSafe: false,
    mobileSafe: true,
  },
  {
    id: "color-wash",
    name: "Color Wash",
    description: "Liquid light theatre — flowing ribbons, prism bands, aurora curtains.",
    animationId: "atmosphereColorWash",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "color",
    defaultIntensity: "normal",
    performanceCost: 2,
    reducedMotionSafe: true,
    mobileSafe: true,
    adminFeatured: true,
  },
];

const byId = new Map(ATMOSPHERE_FX_PRESETS.map((preset) => [preset.id, preset]));

export const DEFAULT_ATMOSPHERE_FX_PRESET_ID = "glow";

export function listAtmosphereFxPresets(opts?: { includeUnpublished?: boolean }): AtmosphereFxPresetDef[] {
  if (opts?.includeUnpublished) return [...ATMOSPHERE_FX_PRESETS];
  return ATMOSPHERE_FX_PRESETS.filter((preset) => preset.status === "published");
}

export function getAtmosphereFxPreset(id: string | null | undefined): AtmosphereFxPresetDef | null {
  if (!id) return null;
  return byId.get(id) ?? null;
}

export function isPublishedAtmosphereFxPreset(id: string | null | undefined): boolean {
  const preset = getAtmosphereFxPreset(id);
  return preset?.status === "published";
}
