import type { Features } from '../audio/AudioFeatureExtractor'
import type { AnimationContext, AnimationOptions } from '../core/IAnimation'
import { getVisualTriggers } from '../audio/VisualTriggers'
import type {
  PublicAnimationContext,
  PublicSharedContext,
  ReadonlyFeatures,
  TheatreLayerOptions,
  TriggerPreset,
} from './types'

const EMPTY_TIME = Object.freeze({ elapsed: 0, delta: 0, frame: 0 })

function freezeFeatures(features?: Features): ReadonlyFeatures | undefined {
  if (!features) return undefined
  return Object.freeze({
    rms: features.rms,
    env: features.env,
    bands: Object.freeze({ ...features.bands }),
    bandEnv: Object.freeze({ ...features.bandEnv }),
    flux: Object.freeze({ ...features.flux }),
    centroid: features.centroid,
  })
}

function pickLayerOptions(options?: AnimationOptions): TheatreLayerOptions {
  if (!options) return {}
  const out: TheatreLayerOptions = {}
  if (options.role !== undefined) out.role = options.role
  if (options.opacity !== undefined) out.opacity = options.opacity
  if (options.zIndex !== undefined) out.zIndex = options.zIndex
  if (options.blendMode !== undefined) out.blendMode = options.blendMode
  if (options.sensitivity !== undefined) out.sensitivity = options.sensitivity
  if (options.intensity !== undefined) out.intensity = options.intensity
  if (options.preset !== undefined) out.preset = options.preset as TriggerPreset
  return out
}

function syntheticTriggers(): ReturnType<typeof getVisualTriggers> {
  return getVisualTriggers(undefined, 'vivid')
}

/** Build the frozen author-facing shared context from runtime shared state. */
export function toPublicSharedContext(shared?: AnimationContext['shared']): PublicSharedContext {
  const time = shared?.time
  const frozenTime = time
    ? Object.freeze({ elapsed: time.elapsed, delta: time.delta, frame: time.frame })
    : EMPTY_TIME

  const getTriggers = shared?.getTriggers
    ? (preset?: TriggerPreset | string) => shared.getTriggers!(preset)
    : (_preset?: TriggerPreset | string) => syntheticTriggers()

  return Object.freeze({
    features: freezeFeatures(shared?.features),
    reducedMotion: shared?.reducedMotion ?? false,
    lowPower: shared?.lowPower ?? false,
    dprClamp: shared?.dprClamp ?? 2,
    particleScale: shared?.particleScale ?? 1,
    time: frozenTime,
    getTriggers,
  })
}

/** Strip internal/runtime-only fields before calling author `draw()`. */
export function toPublicAnimationContext(ctx: AnimationContext): PublicAnimationContext {
  return Object.freeze({
    artworkUrl: ctx.artworkUrl,
    metadata: ctx.metadata ? Object.freeze({ ...ctx.metadata }) : undefined,
    options: Object.freeze(pickLayerOptions(ctx.options)),
    shared: toPublicSharedContext(ctx.shared),
  })
}

/** Read bass/mids/highs from public context only (no analyser fallback). */
export function bandsFromPublicContext(context: PublicAnimationContext) {
  const bands = context.shared.features?.bands
  if (bands) {
    return { bass: bands.bass, mids: bands.mids, highs: bands.highs }
  }
  const t = context.shared.time.elapsed
  return {
    bass: Math.abs(Math.sin(t / 500)) * 0.38,
    mids: Math.abs(Math.sin(t / 400 + 1)) * 0.28,
    highs: Math.abs(Math.sin(t / 300 + 2)) * 0.16,
  }
}
