import type { MotionPreset } from './types'
import type { TheatreObject } from './types'
import type { EngineFrame } from './types'

const DIRECT_POSITION_MOTIONS = new Set<MotionPreset>([
  'orbit', 'bounce', 'spiral', 'tunnel', 'waveRows',
])

export function usesDirectPositionMotion(motion: MotionPreset): boolean {
  return DIRECT_POSITION_MOTIONS.has(motion)
}

export function applyMotion(obj: TheatreObject, motion: MotionPreset, frame: EngineFrame) {
  const { w, h, cx, cy, time, delta, bass, energy, reducedMotion } = frame
  const dt = delta / 1000
  const speedMul = reducedMotion ? 0.5 : 1
  const span = Math.min(w, h)
  const moveScale = 38 * speedMul

  switch (motion) {
    case 'float':
      obj.vx += Math.sin(time * 0.0008 + obj.wavePhase) * 0.018 * speedMul
      obj.vy += Math.cos(time * 0.0009 + obj.wavePhase) * 0.018 * speedMul
      obj.vx *= 0.96; obj.vy *= 0.96
      break
    case 'swarm':
      obj.vx += Math.sin(time * 0.0012 + obj.wavePhase) * 0.022 * speedMul
      obj.vy += Math.cos(time * 0.001 + obj.wavePhase * 1.1) * 0.022 * speedMul
      obj.vx = Math.max(-2.2, Math.min(2.2, obj.vx))
      obj.vy = Math.max(-2.2, Math.min(2.2, obj.vy))
      break
    case 'orbit': {
      const ringR = span * (0.3 + obj.patternRadius * 0.22)
      obj.orbitRadius += (ringR - obj.orbitRadius) * 0.04
      obj.orbitAngle += (0.42 + obj.zBand * 0.08) * dt * speedMul
      obj.x = cx + Math.cos(obj.orbitAngle + obj.wavePhase * 0.02) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle + obj.wavePhase * 0.02) * obj.orbitRadius * 0.86
      return
    }
    case 'falling':
      obj.vy += (0.7 + bass * 0.9) * speedMul
      obj.vx += Math.sin(time * 0.001 + obj.wavePhase) * 0.04
      break
    case 'rising':
      obj.vy -= (0.5 + energy * 0.8) * speedMul
      obj.vx += Math.sin(time * 0.0015 + obj.wavePhase) * 0.05
      break
    case 'bounce':
      obj.x += obj.vx * dt * moveScale
      obj.y += obj.vy * dt * moveScale
      if (obj.x < 48 || obj.x > w - 48) { obj.vx *= -0.92; obj.x = Math.max(48, Math.min(w - 48, obj.x)) }
      if (obj.y < 48 || obj.y > h - 48) { obj.vy *= -0.92; obj.y = Math.max(48, Math.min(h - 48, obj.y)) }
      return
    case 'spiral': {
      obj.orbitAngle += (0.55 + energy * 0.35) * dt * speedMul
      const targetR = span * (0.28 + (Math.sin(obj.orbitAngle * 0.5) * 0.5 + 0.5) * 0.24)
      obj.orbitRadius += (targetR - obj.orbitRadius) * 0.03
      obj.x = cx + Math.cos(obj.orbitAngle) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle) * obj.orbitRadius * 0.86
      return
    }
    case 'tunnel': {
      obj.orbitAngle += dt * 0.28 * speedMul
      obj.orbitRadius -= (18 + bass * 35) * dt * speedMul
      const maxR = span * 0.5
      if (obj.orbitRadius < span * 0.06) obj.orbitRadius = maxR
      obj.x = cx + Math.cos(obj.orbitAngle) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle) * obj.orbitRadius
      obj.baseScale = 0.9 + (1 - obj.orbitRadius / maxR) * 0.9
      return
    }
    case 'waveRows': {
      const rows = 5
      const row = Math.floor(obj.wavePhase * rows) % rows
      const rowY = (row + 0.5) * (h / rows)
      obj.y += (rowY + Math.sin(time * 0.0015 + obj.x * 0.006) * span * 0.04 - obj.y) * 0.08
      obj.x += (1.1 + energy * 0.5) * speedMul
      if (obj.x > w + span * 0.06) obj.x = -span * 0.06
      obj.rot = Math.sin(time * 0.0012 + obj.x * 0.01) * 0.2
      return
    }
    case 'panic':
      obj.vx += Math.sin(time * 0.0012 + obj.wavePhase) * 0.03 * speedMul
      obj.vy += Math.cos(time * 0.001 + obj.wavePhase) * 0.03 * speedMul
      obj.vx *= 0.94; obj.vy *= 0.94
      break
  }

  obj.x += obj.vx * dt * moveScale
  obj.y += obj.vy * dt * moveScale

  if (motion === 'swarm' || motion === 'float' || motion === 'panic') {
    const margin = span * 0.1
    if (obj.x < margin) obj.x = margin
    if (obj.x > w - margin) obj.x = w - margin
    if (obj.y < margin) obj.y = margin
    if (obj.y > h - margin) obj.y = h - margin
  }
  if (motion === 'falling' && obj.y > h + span * 0.08) { obj.y = -span * 0.06; obj.x = cx + (obj.x - cx) * 0.6 }
  if (motion === 'rising' && obj.y < -span * 0.08) { obj.y = h + span * 0.06; obj.x = cx + (obj.x - cx) * 0.6 }
}
