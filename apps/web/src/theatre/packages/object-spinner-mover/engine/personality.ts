import type { PersonalityPreset } from './types'
import type { TheatreObject } from './types'
import type { EngineFrame } from './types'
import { seededRandom } from './rng'

export function pickPersonality(
  defaultPersonality: PersonalityPreset | undefined,
  index: number,
): PersonalityPreset {
  if (defaultPersonality) return defaultPersonality
  const pool: PersonalityPreset[] = ['lazy', 'hyper', 'wobbly', 'bouncy', 'magnetic', 'shy', 'raver', 'heavy']
  return pool[Math.floor(seededRandom(index * 3.7) * pool.length)]!
}

export function applyPersonality(obj: TheatreObject, frame: EngineFrame) {
  const { cx, cy, time, beat, energy } = frame

  switch (obj.personality) {
    case 'lazy':
      obj.vx *= 0.95; obj.vy *= 0.95
      obj.rotSpeed *= 0.98
      break
    case 'hyper':
      obj.vx += (Math.random() - 0.5) * 0.5
      obj.vy += (Math.random() - 0.5) * 0.5
      obj.rotSpeed += (Math.random() - 0.5) * 0.05
      break
    case 'drunk':
      obj.rot += Math.sin(time * 0.005 + obj.wavePhase) * 0.08
      obj.vx += Math.sin(time * 0.003) * 0.1
      break
    case 'wobbly':
      obj.rot += Math.sin(time * 0.008 + obj.wavePhase) * 0.05
      break
    case 'magnetic': {
      const dx = cx - obj.x; const dy = cy - obj.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      obj.vx += (dx / dist) * 0.15
      obj.vy += (dy / dist) * 0.15
      break
    }
    case 'shy': {
      const dx = obj.x - cx; const dy = obj.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      if (dist < 120) { obj.vx += (dx / dist) * 0.3; obj.vy += (dy / dist) * 0.3 }
      break
    }
    case 'raver':
      if (beat) obj.scalePulse = Math.max(obj.scalePulse, 1.2 + energy * 0.5)
      obj.rotSpeed += beat ? 2 : 0
      break
    case 'heavy':
      obj.vy += 0.4
      obj.rotSpeed *= 0.99
      break
    case 'bouncy':
      if (obj.vx > 4) obj.vx = 4
      if (obj.vy > 4) obj.vy = 4
      break
  }
}
