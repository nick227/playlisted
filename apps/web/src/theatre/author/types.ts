import type { BandFeatures, Features } from '../audio/AudioFeatureExtractor'
import type { TriggerFrame } from '../audio/VisualTriggers'
import type { AnimationRole } from '../core/IAnimation'

/** Beat/onset sensitivity preset configured on a layer. */
export type TriggerPreset = 'tame' | 'vivid' | 'chaos' | 'nightmare'

/**
 * Layer options authors may read in `draw()` and set on presets.
 * Platform-controlled styling and audio reactivity only — no internal keys.
 */
export type TheatreLayerOptions = {
  role?: AnimationRole
  opacity?: number
  zIndex?: number
  blendMode?: string
  sensitivity?: number
  intensity?: number
  preset?: TriggerPreset
  /** 0-100 per-scene fx amount override (Atmosphere FX rotation engine only). */
  fxAmount?: number
}

/** Immutable snapshot of extracted audio features passed to authors each frame. */
export type ReadonlyFeatures = Readonly<{
  rms: number
  env: number
  bands: Readonly<BandFeatures>
  bandEnv: Readonly<BandFeatures>
  flux: Readonly<Features['flux']>
  centroid: number
}>

/** Shared runtime state visible to animation authors (no raw analyser). */
export type PublicSharedContext = Readonly<{
  features?: ReadonlyFeatures
  reducedMotion: boolean
  lowPower: boolean
  dprClamp: number
  particleScale: number
  time: Readonly<{ elapsed: number; delta: number; frame: number }>
  getTriggers: (preset?: TriggerPreset | string) => TriggerFrame
}>

/**
 * Per-frame context passed to `CanvasAnimation.draw()`.
 * Intentionally excludes analyser, audioElement, and internal option keys.
 */
export type PublicAnimationContext = Readonly<{
  artworkUrl?: string
  metadata?: Readonly<{ title?: string; artist?: string }>
  options: TheatreLayerOptions
  shared: PublicSharedContext
}>
