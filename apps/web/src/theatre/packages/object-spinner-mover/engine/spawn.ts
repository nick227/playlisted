import type { SpawnStyle } from './types'
import type { TheatreObject } from './types'
import { seededRandom } from './rng'

type SpawnCtx = { w: number; h: number; cx: number; cy: number; index: number; total: number; beat: boolean; initial?: boolean }

export function positionForSpawn(obj: TheatreObject, style: SpawnStyle, ctx: SpawnCtx) {
  const { w, h, cx, cy, index, total, beat } = ctx
  const seed = index * 17.3

  switch (style) {
    case 'edges': {
      const edge = Math.floor(seededRandom(seed) * 4)
      if (edge === 0) { obj.x = -20; obj.y = seededRandom(seed + 1) * h }
      else if (edge === 1) { obj.x = w + 20; obj.y = seededRandom(seed + 1) * h }
      else if (edge === 2) { obj.x = seededRandom(seed + 1) * w; obj.y = -20 }
      else { obj.x = seededRandom(seed + 1) * w; obj.y = h + 20 }
      obj.vx = (cx - obj.x) * 0.01
      obj.vy = (cy - obj.y) * 0.01
      break
    }
    case 'centerBurst': {
      const angle = seededRandom(seed) * Math.PI * 2
      const dist = seededRandom(seed + 2) * 20
      obj.x = cx + Math.cos(angle) * dist
      obj.y = cy + Math.sin(angle) * dist
      obj.vx = Math.cos(angle) * (3 + seededRandom(seed + 3) * 4)
      obj.vy = Math.sin(angle) * (3 + seededRandom(seed + 3) * 4)
      break
    }
    case 'gridFill': {
      const cols = Math.ceil(Math.sqrt(total))
      const col = index % cols
      const row = Math.floor(index / cols)
      obj.x = (col + 0.5) * (w / cols)
      obj.y = (row + 0.5) * (h / Math.ceil(total / cols))
      obj.rotSpeed = (seededRandom(seed + 4) - 0.5) * 4.5
      break
    }
    case 'randomPop':
      obj.x = seededRandom(seed) * w
      obj.y = seededRandom(seed + 5) * h
      break
    case 'beatBurst':
      if (!beat && !ctx.initial) { obj.alive = false; obj.spawnDelay = 0.3; return }
      obj.alive = true
      obj.x = cx + (seededRandom(seed) - 0.5) * w * 0.35
      obj.y = cy + (seededRandom(seed + 1) - 0.5) * h * 0.35
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
      obj.orbitRadius = Math.min(w, h) * (0.2 + seededRandom(seed) * 0.32)
      obj.x = cx + Math.cos(obj.orbitAngle) * obj.orbitRadius
      obj.y = cy + Math.sin(obj.orbitAngle) * obj.orbitRadius
      obj.rotSpeed = (seededRandom(seed + 4) - 0.5) * 4
      break
    }
  }
}

export function shouldRespawn(style: SpawnStyle, beat: boolean): boolean {
  if (style === 'beatBurst') return beat
  return true
}
