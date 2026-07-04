/** Locked top-tier metropolis settings (see PLAN.md). */
export const METRO_SETTINGS = {
  tileSize: 16,
  citySize: 128,
  citySeed: 0x4d455452, // 'METR'
  chunkSize: 8,
  isoYScale: 0.5,
  /** Screen half-width of one tile at zoom 1 — larger = readable iso detail. */
  tileHalfW: 10,
  tileHalfH: 5,
  /** World Z units per floor (iso extrusion height). */
  floorElev: 0.48,
  /** Camera frames this downtown window, not the full 128×128 sprawl. */
  viewBounds: { gx0: 18, gy0: 14, gx1: 102, gy1: 92 },
  cameraDriftX: 0.014,
  cameraDriftY: 0.009,
  audioSwayMaxPx: 28,
  audioZoomPulse: 0.06,
  minZoom: 0.42,
  maxZoom: 1.12,
  targetHoldMs: 120_000,
  loopDurationMs: 120_000,
  trafficCount: 120,
  pedestrianCount: 64,
  trainTrackGy: 32,
} as const

export const ARCHETYPE_COUNT = 48
