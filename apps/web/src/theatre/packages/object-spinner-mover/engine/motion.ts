import type { MotionPreset } from './types'
import type { TheatreObject } from './types'
import type { EngineFrame } from './types'

export function applyMotion(obj: TheatreObject, motion: MotionPreset, frame: EngineFrame) {
  const { w, h, cx, cy, time, delta, bass, energy, reducedMotion } = frame
  const dt = delta / 1000
  const speedMul = reducedMotion ? 0.4 : 1

  switch (motion) {
    case 'float':
      obj.vx += Math.sin(time * 0.001 + obj.wavePhase) * 0.02 * speedMul
      obj.vy += Math.cos(time * 0.0012 + obj.wavePhase) * 0.02 * speedMul
      obj.vx *= 0.98; obj.vy *= 0.98
      break
    case 'swarm':
      obj.vx += (Math.random() - 0.5) * 0.8 * speedMul
      obj.vy += (Math.random() - 0.5) * 0.8 * speedMul
      obj.vx = Math.max(-4, Math.min(4, obj.vx))
      obj.vy = Math.max(-4, Math.min(4, obj.vy))
      break
    case 'orbit':
      obj.orbitAngle += (0.8 + obj.zBand * 0.2) * dt * speedMul
      obj.x = cx + Math.cos(obj.orbitAngle + obj.wavePhase) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle + obj.wavePhase) * obj.orbitRadius * 0.7
      obj.rot += obj.rotSpeed * dt
      return
    case 'falling':
      obj.vy += (1.2 + bass * 2) * speedMul
      obj.vx += Math.sin(time * 0.002 + obj.wavePhase) * 0.05
      break
    case 'rising':
      obj.vy -= (0.8 + energy * 1.5) * speedMul
      obj.vx += Math.sin(time * 0.003 + obj.wavePhase) * 0.08
      break
    case 'bounce':
      obj.x += obj.vx * dt * 60 * speedMul
      obj.y += obj.vy * dt * 60 * speedMul
      if (obj.x < 20 || obj.x > w - 20) { obj.vx *= -1; obj.x = Math.max(20, Math.min(w - 20, obj.x)) }
      if (obj.y < 20 || obj.y > h - 20) { obj.vy *= -1; obj.y = Math.max(20, Math.min(h - 20, obj.y)) }
      obj.rot += obj.rotSpeed * dt
      return
    case 'spiral':
      obj.orbitAngle += (1.5 + energy) * dt * speedMul
      obj.orbitRadius *= 0.999 + energy * 0.001
      if (obj.orbitRadius < 20) obj.orbitRadius = Math.min(w, h) * 0.45
      obj.x = cx + Math.cos(obj.orbitAngle) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle) * obj.orbitRadius
      obj.rot += obj.rotSpeed * dt * 2
      return
    case 'tunnel': {
      obj.orbitAngle += dt * 0.4 * speedMul
      obj.orbitRadius -= (30 + bass * 80) * dt * speedMul
      const maxR = Math.max(40, Math.min(w, h) * 0.5)
      if (obj.orbitRadius < 10) obj.orbitRadius = maxR
      obj.x = cx + Math.cos(obj.orbitAngle) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle) * obj.orbitRadius
      obj.baseScale = 0.3 + (1 - obj.orbitRadius / maxR) * 1.2
      obj.rot += obj.rotSpeed * dt
      return
    }
    case 'waveRows': {
      const row = Math.floor(obj.wavePhase * 5) % 5
      const rowY = (row + 0.5) * (h / 5)
      obj.y = rowY + Math.sin(time * 0.003 + obj.x * 0.01) * 30
      obj.x += (1.5 + energy) * speedMul
      if (obj.x > w + 40) obj.x = -40
      obj.rot = Math.sin(time * 0.002 + obj.x * 0.02) * 0.3
      return
    }
    case 'panic':
      obj.vx += (Math.random() - 0.5) * 3 * speedMul * (1 + energy)
      obj.vy += (Math.random() - 0.5) * 3 * speedMul * (1 + energy)
      obj.rotSpeed += (Math.random() - 0.5) * 0.2
      break
  }

  obj.x += obj.vx * dt * 60 * speedMul
  obj.y += obj.vy * dt * 60 * speedMul
  obj.rot += obj.rotSpeed * dt

  if (motion === 'swarm' || motion === 'float' || motion === 'panic') {
    if (obj.x < -40) obj.x = w + 40
    if (obj.x > w + 40) obj.x = -40
    if (obj.y < -40) obj.y = h + 40
    if (obj.y > h + 40) obj.y = -40
  }
  if (motion === 'falling' && obj.y > h + 60) { obj.y = -40; obj.x = Math.random() * w }
  if (motion === 'rising' && obj.y < -60) { obj.y = h + 40; obj.x = Math.random() * w }
}
