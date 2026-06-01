import type { BackWallBounds } from './types'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

export function hash01(seed: number, salt: number) {
  let value = (seed ^ Math.imul(salt + 0x9e3779b9, 0x85ebca6b)) >>> 0
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d) >>> 0
  value ^= value >>> 15
  value = Math.imul(value, 0x846ca68b) >>> 0
  value ^= value >>> 16
  return (value >>> 0) / 0xffffffff
}

/** Screen-space back wall rect for 2D scene compositions. */
export function backWallBounds(width: number, height: number): BackWallBounds {
  const top = height * 0.2
  const bottom = height * 0.68
  const left = width * 0.14
  const right = width * 0.86

  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) * 0.5,
    centerY: (top + bottom) * 0.5,
  }
}
