/** Locked top-tier metropolis settings (see PLAN.md). */
export const METRO_SETTINGS = {
  tileSize: 16,
  citySize: 128,
  citySeed: 0x4d455452, // 'METR'
  chunkSize: 8,
  isoYScale: 0.5,
  /** Screen half-width of one tile at zoom 1 — larger = readable iso detail. */
  tileHalfW: 14,
  tileHalfH: 7,
  /** World Z units per floor (iso extrusion height). */
  floorElev: 0.82,
  /** Minimum building wall height in screen pixels (boosts low/short blocks). */
  minWallPx: 20,
  /** Camera frames this downtown core — not the full 128×128 sprawl. */
  viewBounds: { gx0: 44, gy0: 32, gx1: 84, gy1: 72 },
  cameraDriftX: 0.014,
  cameraDriftY: 0.009,
  audioSwayMaxPx: 28,
  audioZoomPulse: 0.06,
  minZoom: 0.55,
  maxZoom: 1.45,
  targetHoldMs: 120_000,
  loopDurationMs: 120_000,
  trafficCount: 120,
  pedestrianCount: 64,
  trainTrackGy: 32,
} as const

export const ARCHETYPE_COUNT = 48
