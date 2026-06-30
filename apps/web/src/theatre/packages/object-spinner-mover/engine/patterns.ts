import type { EngineFrame, TheatreObject } from './types'

/** Ring radii as fraction of half-screen — keeps stickers spread, not piled in center. */
const FORMATION_RINGS = [0.36, 0.48, 0.58] as const
const SHARED_ORBIT_RATE = 0.00038

function clampRotSpeed(obj: TheatreObject) {
  if (obj.rotSpeed > 0.9) obj.rotSpeed = 0.9
  else if (obj.rotSpeed < -0.9) obj.rotSpeed = -0.9
}

/** Smooth synchronized rings — shared phase rotation with gentle individual wobble. */
export function applyFormationPattern(
  obj: TheatreObject,
  index: number,
  total: number,
  frame: EngineFrame,
  bandCount: number,
) {
  const { cx, cy, w, h, time, delta, bass, reducedMotion } = frame
  const dt = delta / 1000
  const speedMul = reducedMotion ? 0.55 : 1
  const span = Math.min(w, h)

  const ringIdx = obj.zBand % FORMATION_RINGS.length
  const ringR = span * (FORMATION_RINGS[ringIdx]! + obj.patternRadius * 0.06)
  const slot = (index / Math.max(1, total)) * Math.PI * 2
  const sharedPhase = time * SHARED_ORBIT_RATE * speedMul
  const breathe = 1 + Math.sin(time * 0.00075 + slot * 0.5) * 0.03

  const angle = slot + sharedPhase + obj.wavePhase * 0.015
  const tx = cx + Math.cos(angle) * ringR * breathe
  const ty = cy + Math.sin(angle) * ringR * breathe * 0.86

  const ease = 0.06 * speedMul
  obj.x += (tx - obj.x) * ease
  obj.y += (ty - obj.y) * ease

  const sharedSpin = (0.22 + bass * 0.08) * speedMul
  obj.rot += sharedSpin * dt
  obj.rot += obj.rotSpeed * dt * 0.2

  obj.vx *= 0.88
  obj.vy *= 0.88
  clampRotSpeed(obj)
}

export function applySyncedSpin(obj: TheatreObject, frame: EngineFrame, bandCount: number) {
  const dt = frame.delta / 1000
  const speedMul = frame.reducedMotion ? 0.55 : 1
  const bandRate = 1 + (obj.zBand / Math.max(1, bandCount - 1)) * 0.12
  const sharedSpin = 0.2 * bandRate * speedMul

  obj.rot += sharedSpin * dt
  obj.rot += obj.rotSpeed * dt * 0.18
  clampRotSpeed(obj)
}
