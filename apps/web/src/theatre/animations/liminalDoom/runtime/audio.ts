import type { AnimationContext } from '../../../core/IAnimation'
import type { AudioReact } from '../core/types'
import { clamp } from '../core/math'

export type AudioBands = {
  bass: number
  mids: number
  highs: number
}

export function createAudioReact(context: AnimationContext, bands: AudioBands): AudioReact {
  const features = context.shared?.features
  const triggers = context.shared?.getTriggers?.('vivid')
  const sensitivity = context.options?.sensitivity ?? 1
  const intensity = context.options?.intensity ?? 1

  return {
    bass: clamp(bands.bass * sensitivity * intensity, 0, 1),
    mids: clamp(bands.mids * sensitivity * intensity * 0.85, 0, 1),
    highs: clamp(bands.highs * sensitivity * intensity * 0.65, 0, 1),
    beat: triggers?.beat ? 1 : clamp((features?.flux.overall ?? 0) * 2, 0, 0.6),
    chaos: triggers?.chaosHit ? 1 : clamp(triggers?.energy ?? 0, 0, 1),
  }
}
