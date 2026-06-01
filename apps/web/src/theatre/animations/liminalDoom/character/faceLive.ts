import { clamp } from '../types'

function h(seed: number, salt: number): number {
  let v = (seed ^ ((salt + 0x9e3779b9) | 0)) >>> 0
  v ^= v >>> 16
  v = Math.imul(v, 0x7feb352d) >>> 0
  v ^= v >>> 15
  v = Math.imul(v, 0x846ca68b) >>> 0
  v ^= v >>> 16
  return (v >>> 0) / 0xffffffff
}

/** 0 = closed, 1 = open. */
export function blinkOpen(timeMs: number, seed: number): number {
  const period = 3200 + h(seed, 70) * 2800
  const t = (timeMs % period) / period
  if (t < 0.94) return 1
  const close = (t - 0.94) / 0.06
  return 1 - clamp(close * close * 3, 0, 1)
}

/** Occasional pupil dart — returns extra track offset. */
export function saccadeJitter(timeMs: number, seed: number): { x: number; y: number } {
  const gate = Math.sin(timeMs / 900 + seed * 0.7)
  if (gate < 0.92) return { x: 0, y: 0 }
  const amp = 0.08 + h(seed, 71) * 0.12
  return {
    x: (h(seed, 72) - 0.5) * amp,
    y: (h(seed, 73) - 0.5) * amp * 0.6,
  }
}
