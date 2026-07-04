import { expSmooth, expSmoothVec2 } from './expSmooth'

export function smoothEntityPosition(
  displayX: number,
  displayY: number,
  targetX: number,
  targetY: number,
  deltaMs: number,
  tauMs = 55,
): [number, number] {
  return expSmoothVec2(displayX, displayY, targetX, targetY, deltaMs, tauMs)
}

export function smoothScalar(current: number, target: number, deltaMs: number, tauMs: number): number {
  return expSmooth(current, target, deltaMs, tauMs)
}
