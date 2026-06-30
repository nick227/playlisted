import type { AnimationContext } from '../core/IAnimation'
import type AudioFeatureExtractor from '../audio/AudioFeatureExtractor'
import { getVisualTriggers } from '../audio/VisualTriggers'
import { detectPolicy, type PerformancePolicy } from '../runtime/PerformancePolicy'

export type FrameContextInput = {
  audioEl: HTMLMediaElement | null
  analyser?: AnalyserNode | null
  mediaSrc: string | null
  artworkUrl: string | null
  featuresRef?: ReturnType<AudioFeatureExtractor['getFeatures']>
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
  const triggerCache: Record<string, { frame: number; triggers: ReturnType<typeof getVisualTriggers> }> = {}
  const { featuresRef } = input

  const ctx: AnimationContext = {
    audioElement: input.audioEl || undefined,
    analyser: input.analyser || undefined,
    mediaSrc: input.mediaSrc || undefined,
    artworkUrl: input.artworkUrl || undefined,
    options: {},
    shared: {
      features: featuresRef,
      reducedMotion,
      lowPower: policy.lowPower,
      dprClamp: policy.dprClamp,
      particleScale: policy.particleScale,
      time: timeRef,
      getTriggers: (preset = 'vivid') => {
        const frame = timeRef.frame
        const record = triggerCache[preset]
        if (record?.frame === frame) return record.triggers
        const triggers = getVisualTriggers(featuresRef, preset)
        triggerCache[preset] = { frame, triggers }
        return triggers
      },
    },
  }

  return { ctx, policy }
}
