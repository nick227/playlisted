import type { PersonalityPreset } from './types'
import type { TheatreObject } from './types'
import type { EngineFrame } from './types'
import { seededRandom } from './rng'

const CALM_POOL: PersonalityPreset[] = ['lazy', 'wobbly', 'shy']

export function pickPersonality(
  defaultPersonality: PersonalityPreset | undefined,
  index: number,
): PersonalityPreset {
  if (defaultPersonality) return defaultPersonality
  return CALM_POOL[Math.floor(seededRandom(index * 3.7) * CALM_POOL.length)]!
}

export function applyPersonality(obj: TheatreObject, frame: EngineFrame) {
  const { cx, cy, time, beat, energy } = frame

  switch (obj.personality) {
    case 'lazy':
      obj.vx *= 0.96; obj.vy *= 0.96
      obj.rotSpeed *= 0.99
      break
    case 'hyper':
      obj.vx += Math.sin(time * 0.0014 + obj.wavePhase) * 0.04
      obj.vy += Math.cos(time * 0.0011 + obj.wavePhase) * 0.04
      break
    case 'drunk':
      obj.rot += Math.sin(time * 0.002 + obj.wavePhase) * 0.02
      break
    case 'wobbly':
      obj.rot += Math.sin(time * 0.003 + obj.wavePhase) * 0.018
      break
    case 'magnetic': {
      const dx = cx - obj.x; const dy = cy - obj.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      if (dist > 80) {
        obj.vx += (dx / dist) * 0.02
        obj.vy += (dy / dist) * 0.02
      }
      break
    }
    case 'shy': {
      const dx = obj.x - cx; const dy = obj.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      if (dist < 90) { obj.vx += (dx / dist) * 0.06; obj.vy += (dy / dist) * 0.06 }
      break
    }
    case 'raver':
      if (beat) obj.scalePulse = Math.max(obj.scalePulse, 1.08 + energy * 0.12)
      break
    case 'heavy':
      obj.vy += 0.08
      break
    case 'bouncy':
      if (obj.vx > 1.8) obj.vx = 1.8
      if (obj.vy > 1.8) obj.vy = 1.8
      break
  }
}
