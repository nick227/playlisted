import type { AnimationContext } from '../../../core/IAnimation'
import type { ObjectTheatrePreset } from './types'

export type ObjectTheatrePerf = {
  objectCount: number
  sizeMul: number
  usePatternDrift: boolean
  useMacroFx: boolean
  useEqWave: boolean
  depthBands: number
}

const MAX_OBJECTS = 14
const LOW_OBJECTS = 10
const CALM_OBJECTS = 8

export function resolveObjectTheatrePerf(
  preset: ObjectTheatrePreset,
  context: AnimationContext,
): ObjectTheatrePerf {
  const particleScale = context.shared?.particleScale ?? 1
  const lowPower = context.shared?.lowPower ?? false
  const reduced = context.shared?.reducedMotion ?? false
  const requested = preset.objectCount ?? 12

  let objectCount = requested
  if (reduced || particleScale <= 0) objectCount = Math.min(requested, CALM_OBJECTS)
  else if (lowPower || particleScale <= 0.5) objectCount = Math.min(requested, LOW_OBJECTS)
  else objectCount = Math.min(requested, MAX_OBJECTS)

  const sizeMul = (reduced ? 0.048 : lowPower ? 0.052 : 0.058) * Math.max(0.7, particleScale)

  return {
    objectCount,
    sizeMul,
    usePatternDrift: !reduced && particleScale > 0.35,
    useMacroFx: !reduced && particleScale > 0.2,
    useEqWave: particleScale > 0.15,
    depthBands: reduced || lowPower ? 2 : Math.min(preset.depthBands ?? 2, 3),
  }
}
