import { clamp, lerp } from '../core/math'
import { faceHash as h } from './faceUtil'

export function idleBreath(timeMs: number, seed: number): number {
  const period = 3200 + h(seed, 99) * 1200
  return 1 + Math.sin((timeMs / period) * Math.PI * 2) * 0.04
}

export function watchingGaze(timeMs: number, seed: number): { trackX: number; trackY: number } {
  const tx = Math.sin(timeMs / (4100 + h(seed, 60) * 2000)) * 0.6
  const ty = Math.sin(timeMs / (5300 + h(seed, 61) * 1800)) * 0.35
  return { trackX: tx, trackY: ty }
}

export function tickDissolve(
  alpha: number,
  fragLevel: number,
  dtMs: number,
  highs: number,
): { dissolveAlpha: number; fragmentLevel: number } {
  const rate = (0.0004 + highs * 0.0012) * dtMs
  const newAlpha = clamp(alpha - rate, 0, 1)
  const newFrag = clamp(lerp(fragLevel, 1 - newAlpha, 0.08), 0, 1)
  return { dissolveAlpha: newAlpha, fragmentLevel: newFrag }
}
