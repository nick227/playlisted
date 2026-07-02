import type { AnimationContext, IAnimation } from '../core/IAnimation'
import type AudioFeatureExtractor from '../audio/AudioFeatureExtractor'
import type { ScenePresetDef } from '../registry/scenePresets'
import {
  getTriggersForPreset,
  type TheatreAudioSnapshot,
} from '../audio/TheatreAudioBus'
import { detectPolicy, type PerformancePolicy } from '../runtime/PerformancePolicy'

export type FrameContextInput = {
  audioEl: HTMLMediaElement | null
  analyser?: AnalyserNode | null
  mediaSrc: string | null
  artworkUrl: string | null
  featuresRef?: ReturnType<AudioFeatureExtractor['getFeatures']>
  audioSnapshot?: TheatreAudioSnapshot
  existingTimeRef?: { elapsed: number; delta: number; frame: number }
}

export function buildAnimationFrameContext(input: FrameContextInput): {
  ctx: AnimationContext
  policy: PerformancePolicy
} {
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const policy = detectPolicy(reducedMotion)
  const timeRef = input.existingTimeRef || { elapsed: 0, delta: 0, frame: 0 }
  const { featuresRef } = input

  const shared = {
    features: featuresRef,
    audio: input.audioSnapshot,
    reducedMotion,
    lowPower: policy.lowPower,
    dprClamp: policy.dprClamp,
    particleScale: policy.particleScale,
    time: timeRef,
    getTriggers: (preset = 'vivid') => getTriggersForPreset(shared.audio, preset),
  }

  const ctx: AnimationContext = {
    audioElement: input.audioEl || undefined,
    analyser: input.analyser || undefined,
    mediaSrc: input.mediaSrc || undefined,
    artworkUrl: input.artworkUrl || undefined,
    options: {},
    shared,
  }

  return { ctx, policy }
}

export function mergePresetLayerOptions(
  baseCtx: AnimationContext,
  preset: ScenePresetDef | null | undefined,
): AnimationContext {
  if (!preset) return baseCtx

  const mergedOptions = { ...baseCtx.options }
  for (const layer of preset.layers) {
    if (layer.options) Object.assign(mergedOptions, layer.options)
  }
  mergedOptions.objectTheatrePresetId = preset.id

  return {
    ...baseCtx,
    options: mergedOptions,
  }
}

const theatreInitContextKey = Symbol('theatreInitContext')

export function withTheatreInitContext(instance: IAnimation, ctx: AnimationContext): IAnimation {
  Object.defineProperty(instance, theatreInitContextKey, {
    value: ctx,
    enumerable: false,
    writable: true,
    configurable: true,
  })
  return instance
}

export function resolveTheatreInitContext(instance: IAnimation, fallback: AnimationContext): AnimationContext {
  const bag = instance as IAnimation & { [theatreInitContextKey]?: AnimationContext }
  const ctx = bag[theatreInitContextKey] ?? fallback
  delete bag[theatreInitContextKey]
  return ctx
}
