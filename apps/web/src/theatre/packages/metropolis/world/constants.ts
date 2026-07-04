/** Locked top-tier metropolis settings (see PLAN.md). */
export const METRO_SETTINGS = {
  tileSize: 16,
  citySize: 128,
  citySeed: 0x4d455452, // 'METR'
  chunkSize: 8,
  isoYScale: 0.5,
  tileHalfW: 8,
  tileHalfH: 4,
  cameraDriftX: 0.014,
  cameraDriftY: 0.009,
  audioSwayMaxPx: 28,
  audioZoomPulse: 0.06,
  minZoom: 0.28,
  maxZoom: 1.08,
  targetHoldMs: 120_000,
  loopDurationMs: 120_000,
  trafficCount: 120,
  pedestrianCount: 64,
  trainTrackGy: 32,
} as const

export const ARCHETYPE_COUNT = 48
