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
    description: "Volumetric light — aurora shafts, spots, embers, halo; morphing void/neon/blood moods.",
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
    description: "Comic dancing perimeter matte — shifting angular aperture, colored rim, note ticks; 100 size = edges meet at center.",
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
    // Tuned default (VIGNETTE_MAX_SIZE_PCT) is 15 — a much lower baseline
    // than the generic rotation floor, so give it its own low floor.
    minAmountPct: 5,
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
    // Tuned default (BARS_MAX_HEIGHT_PCT) is 3 — deliberately near-floor so
    // notes "shoot" dramatically off a quiet baseline; the generic rotation
    // floor would always override that upward, so give it its own floor.
    minAmountPct: 0,
  },
  {
    id: "radial",
    name: "Multi-Shape",
    description: "Infinite fractal patterns — roses, vortices, lattices, Julia/IFS/trees + hit FX; 100 size = full screen.",
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
    description: "Liquid light — ribbons, curtains, tide, prism, smoke; morphing club moods.",
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
  {
    id: "kaleidoscope",
    name: "Kaleidoscope",
    description: "Infinite fractal procedural kaleidoscope responding to track energy and moods.",
    animationId: "atmosphereKaleidoscope",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "radial",
    defaultIntensity: "normal",
    performanceCost: 3,
    reducedMotionSafe: false,
    mobileSafe: true,
    adminFeatured: true,
  },
  {
    id: "sonar",
    name: "Sonar",
    description: "Rhythm-forward shockwave rings ping outward on every beat; centroid steers a slow hue rotation, radar sweep and lock-on ticks vary by style.",
    animationId: "atmosphereSonar",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "sonar",
    defaultIntensity: "normal",
    performanceCost: 2,
    reducedMotionSafe: true,
    mobileSafe: true,
  },
  {
    id: "glitch",
    name: "Glitch",
    description: "True broadcast-signal corruption — a persistence buffer accumulates and self-tears, split into real R/G/B channels that desync per-band (red on bass, blue on highs), finished with grain, head-switch noise, and blur-bloom.",
    animationId: "atmosphereGlitch",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "glitch",
    defaultIntensity: "normal",
    performanceCost: 3,
    reducedMotionSafe: false,
    mobileSafe: true,
    adminFeatured: true,
  },
  {
    id: "shatter",
    name: "Shatter",
    description: "Broken-mirror FX — the frame cracks from an impact point on hard bass hits, then slowly heals; spiderweb, ice-crack, and bullet-hole topologies.",
    animationId: "atmosphereShatter",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "shatter",
    defaultIntensity: "normal",
    performanceCost: 2,
    reducedMotionSafe: false,
    mobileSafe: true,
  },
  {
    id: "laser-grid",
    name: "Laser Grid",
    description: "A real pinhole-camera tunnel — wireframe rings converge on a true vanishing point while volumetric rig beams taper with distance; depth fog, floor reflection, and a lens flare finish the shot. A run of bass hits builds real forward momentum.",
    animationId: "atmosphereLaserGrid",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "laser",
    defaultIntensity: "normal",
    performanceCost: 3,
    reducedMotionSafe: false,
    mobileSafe: true,
    adminFeatured: true,
  },
  {
    id: "glyph-rain",
    name: "Glyph Rain",
    description: "Occult glyph rain — runes, alchemical, Greek, hex, or glitch marks fall Matrix-style; highs drive speed, onset flux drives character flicker.",
    animationId: "atmosphereGlyphRain",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "glyph",
    defaultIntensity: "normal",
    performanceCost: 3,
    reducedMotionSafe: true,
    mobileSafe: true,
  },
  {
    id: "firefly",
    name: "Firefly Swarm",
    description: "Lazy-drifting swarm of light agents scatters outward on spectral-flux transients and slowly regains cohesion — true flocking, not a particle burst.",
    animationId: "atmosphereFirefly",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "firefly",
    defaultIntensity: "normal",
    performanceCost: 3,
    reducedMotionSafe: true,
    mobileSafe: true,
  },
  {
    id: "warp-starfield",
    name: "Warp Starfield",
    description: "Hyperspace star stream from center; a chaos hit detonates a sharp one-shot warp-jump spike rather than a gradual build.",
    animationId: "atmosphereWarpStarfield",
    author: "playlisted",
    source: "platform",
    status: "published",
    category: "warp",
    defaultIntensity: "normal",
    performanceCost: 2,
    reducedMotionSafe: false,
    mobileSafe: true,
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
