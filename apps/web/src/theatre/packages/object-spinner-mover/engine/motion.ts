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
  const speedMul = reducedMotion ? 0.45 : 1
  const span = Math.min(w, h)

  switch (motion) {
    case 'float':
      obj.vx += Math.sin(time * 0.001 + obj.wavePhase) * 0.06 * speedMul
      obj.vy += Math.cos(time * 0.0012 + obj.wavePhase) * 0.06 * speedMul
      obj.vx *= 0.985; obj.vy *= 0.985
      break
    case 'swarm':
      obj.vx += (Math.random() - 0.5) * 1.4 * speedMul
      obj.vy += (Math.random() - 0.5) * 1.4 * speedMul
      obj.vx = Math.max(-6, Math.min(6, obj.vx))
      obj.vy = Math.max(-6, Math.min(6, obj.vy))
      break
    case 'orbit':
      obj.orbitAngle += (1.1 + obj.zBand * 0.35) * dt * speedMul
      obj.orbitRadius = span * (0.16 + obj.patternRadius * 0.32)
      obj.x = cx + Math.cos(obj.orbitAngle + obj.wavePhase) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle + obj.wavePhase) * obj.orbitRadius * 0.72
      obj.rot += obj.rotSpeed * dt * 1.4
      return
    case 'falling':
      obj.vy += (1.8 + bass * 2.5) * speedMul
      obj.vx += Math.sin(time * 0.002 + obj.wavePhase) * 0.12
      break
    case 'rising':
      obj.vy -= (1.2 + energy * 2) * speedMul
      obj.vx += Math.sin(time * 0.003 + obj.wavePhase) * 0.14
      break
    case 'bounce':
      obj.x += obj.vx * dt * 72 * speedMul
      obj.y += obj.vy * dt * 72 * speedMul
      if (obj.x < 40 || obj.x > w - 40) { obj.vx *= -1; obj.x = Math.max(40, Math.min(w - 40, obj.x)) }
      if (obj.y < 40 || obj.y > h - 40) { obj.vy *= -1; obj.y = Math.max(40, Math.min(h - 40, obj.y)) }
      obj.rot += obj.rotSpeed * dt * 1.6
      return
    case 'spiral':
      obj.orbitAngle += (2.2 + energy * 1.5) * dt * speedMul
      obj.orbitRadius *= 0.998 + energy * 0.0015
      if (obj.orbitRadius < span * 0.04) obj.orbitRadius = span * 0.48
      obj.x = cx + Math.cos(obj.orbitAngle) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle) * obj.orbitRadius
      obj.rot += obj.rotSpeed * dt * 2.8
      return
    case 'tunnel': {
      obj.orbitAngle += dt * 0.65 * speedMul
      obj.orbitRadius -= (45 + bass * 100) * dt * speedMul
      const maxR = Math.max(span * 0.08, span * 0.52)
      if (obj.orbitRadius < span * 0.02) obj.orbitRadius = maxR
      obj.x = cx + Math.cos(obj.orbitAngle) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle) * obj.orbitRadius
      obj.baseScale = 0.85 + (1 - obj.orbitRadius / maxR) * 1.6
      obj.rot += obj.rotSpeed * dt * 1.8
      return
    }
    case 'waveRows': {
      const rows = 5
      const row = Math.floor(obj.wavePhase * rows) % rows
      const rowY = (row + 0.5) * (h / rows)
      obj.y = rowY + Math.sin(time * 0.003 + obj.x * 0.008) * span * 0.06
      obj.x += (2.5 + energy * 1.5) * speedMul
      if (obj.x > w + span * 0.08) obj.x = -span * 0.08
      obj.rot = Math.sin(time * 0.002 + obj.x * 0.015) * 0.5 + obj.rotSpeed * 0.15
      return
    }
    case 'panic': {
      const wobble = Math.sin(time * 0.005 + obj.wavePhase) * (1 + energy)
      const wobbleY = Math.cos(time * 0.004 + obj.wavePhase * 1.3) * (1 + energy)
      obj.vx += wobble * 2.2 * speedMul
      obj.vy += wobbleY * 2.2 * speedMul
      obj.rotSpeed += wobble * 0.08 * speedMul
      break
    }
  }

  obj.x += obj.vx * dt * 72 * speedMul
  obj.y += obj.vy * dt * 72 * speedMul

  if (motion === 'swarm' || motion === 'float' || motion === 'panic') {
    if (obj.x < -span * 0.08) obj.x = w + span * 0.08
    if (obj.x > w + span * 0.08) obj.x = -span * 0.08
    if (obj.y < -span * 0.08) obj.y = h + span * 0.08
    if (obj.y > h + span * 0.08) obj.y = -span * 0.08
  }
  if (motion === 'falling' && obj.y > h + span * 0.1) { obj.y = -span * 0.08; obj.x = Math.random() * w }
  if (motion === 'rising' && obj.y < -span * 0.1) { obj.y = h + span * 0.08; obj.x = Math.random() * w }
}
