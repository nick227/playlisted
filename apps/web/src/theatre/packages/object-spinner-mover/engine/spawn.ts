import type { SpawnStyle } from './types'
import type { TheatreObject } from './types'
import { seededRandom } from './rng'

type SpawnCtx = { w: number; h: number; cx: number; cy: number; index: number; total: number; beat: boolean; initial?: boolean }

export function positionForSpawn(obj: TheatreObject, style: SpawnStyle, ctx: SpawnCtx) {
  const { w, h, cx, cy, index, total, beat } = ctx
  const seed = index * 17.3
  const span = Math.min(w, h)

  switch (style) {
    case 'edges': {
      const edge = Math.floor(seededRandom(seed) * 4)
      if (edge === 0) { obj.x = span * 0.04; obj.y = seededRandom(seed + 1) * h }
      else if (edge === 1) { obj.x = w - span * 0.04; obj.y = seededRandom(seed + 1) * h }
      else if (edge === 2) { obj.x = seededRandom(seed + 1) * w; obj.y = span * 0.04 }
      else { obj.x = seededRandom(seed + 1) * w; obj.y = h - span * 0.04 }
      obj.vx = (cx - obj.x) * 0.002
      obj.vy = (cy - obj.y) * 0.002
      break
    }
    case 'centerBurst': {
      const angle = (index / Math.max(1, total)) * Math.PI * 2 + seededRandom(seed) * 0.2
      const dist = span * (0.28 + seededRandom(seed + 2) * 0.22)
      obj.x = cx + Math.cos(angle) * dist
      obj.y = cy + Math.sin(angle) * dist * 0.86
      obj.vx = Math.cos(angle) * 0.4
      obj.vy = Math.sin(angle) * 0.4
      obj.orbitAngle = angle
      obj.orbitRadius = dist
      break
    }
    case 'gridFill': {
      const cols = Math.ceil(Math.sqrt(total))
      const col = index % cols
      const row = Math.floor(index / cols)
      obj.x = (col + 0.5) * (w / cols)
      obj.y = (row + 0.5) * (h / Math.ceil(total / cols))
      obj.rotSpeed = (seededRandom(seed + 4) - 0.5) * 0.6
      break
    }
    case 'randomPop': {
      const angle = seededRandom(seed) * Math.PI * 2
      const dist = span * (0.22 + seededRandom(seed + 5) * 0.32)
      obj.x = cx + Math.cos(angle) * dist
      obj.y = cy + Math.sin(angle) * dist * 0.86
      break
    }
    case 'beatBurst':
      if (!beat && !ctx.initial) { obj.alive = false; obj.spawnDelay = 0.3; return }
      obj.alive = true
      obj.x = cx + (seededRandom(seed) - 0.5) * w * 0.5
      obj.y = cy + (seededRandom(seed + 1) - 0.5) * h * 0.45
      break
    case 'fountain':
      obj.x = cx + (seededRandom(seed) - 0.5) * w * 0.4
      obj.y = h + 20
      obj.vy = -(4 + seededRandom(seed + 2) * 6)
      obj.vx = (seededRandom(seed + 3) - 0.5) * 3
      break
    case 'rain':
      obj.x = seededRandom(seed) * w
      obj.y = -20 - seededRandom(seed + 1) * 100
      obj.vy = 2 + seededRandom(seed + 2) * 4
      break
    case 'orbitRing': {
      obj.orbitAngle = (index / total) * Math.PI * 2
      obj.orbitRadius = Math.min(w, h) * (0.3 + seededRandom(seed) * 0.24)
      obj.x = cx + Math.cos(obj.orbitAngle) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle) * obj.orbitRadius * 0.86
      obj.rotSpeed = (seededRandom(seed + 4) - 0.5) * 0.6
      break
    }
  }
}

export function shouldRespawn(style: SpawnStyle, beat: boolean): boolean {
  if (style === 'beatBurst') return beat
  return true
}
