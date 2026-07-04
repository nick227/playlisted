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
  /** Graphic novel = curated blocks; simcity = per-tile sprawl (legacy). */
  renderMode: 'graphicNovel' as const,
  /** Camera frames the composed street panel. */
  viewBounds: { gx0: 42, gy0: 36, gx1: 74, gy1: 58 },
  cameraDriftX: 0.014,
  cameraDriftY: 0.009,
  audioSwayMaxPx: 28,
  audioZoomPulse: 0.06,
  minZoom: 0.55,
  maxZoom: 1.45,
  targetHoldMs: 120_000,
  loopDurationMs: 120_000,
  trafficCount: 14,
  pedestrianCount: 18,
  trainTrackGy: 32,
} as const

export const ARCHETYPE_COUNT = 48
