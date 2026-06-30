import type { BeatBehavior } from './types'
import type { TheatreObject } from './types'
import type { EngineFrame } from './types'

export type BeatState = { bgFlash: number; dropBurst: number; silenceMs: number; lastEnergy: number }

export function createBeatState(): BeatState {
  return { bgFlash: 0, dropBurst: 0, silenceMs: 0, lastEnergy: 0 }
}

export function updateBeatState(state: BeatState, frame: EngineFrame, behavior: BeatBehavior): BeatState {
  const next = { ...state }
  next.bgFlash = Math.max(0, state.bgFlash - frame.delta * 0.004)
  next.dropBurst = Math.max(0, state.dropBurst - frame.delta * 0.003)

  if (frame.energy < 0.08) next.silenceMs += frame.delta
  else next.silenceMs = 0

  if (behavior === 'dropExplosion' && frame.energy > 0.5 && state.silenceMs > 800) {
    next.dropBurst = 1
    next.silenceMs = 0
  }

  if (frame.beat || frame.bassHit) {
    if (behavior === 'backgroundFlash' || behavior === 'colorFlash') next.bgFlash = 1
    if (behavior === 'dropExplosion' && frame.bassHit) next.dropBurst = Math.max(next.dropBurst, 0.8)
  }

  next.lastEnergy = frame.energy
  return next
}

export function applyBeatToObject(
  obj: TheatreObject,
  behavior: BeatBehavior,
  frame: EngineFrame,
  beatState: BeatState,
) {
  if (!frame.beat && !frame.bassHit && beatState.dropBurst < 0.1) return

  switch (behavior) {
    case 'scaleOnBeat':
      if (frame.beat) obj.scalePulse = 1.4
      break
    case 'spinKick':
      if (frame.beat) obj.rotSpeed += (Math.random() > 0.5 ? 1 : -1) * 4
      break
    case 'burstSpawn':
    case 'spawnMore':
      break
    case 'bassGravity':
      if (frame.bassHit) obj.vy += 3 + frame.bass * 5
      break
    case 'snareShuffle':
      if (frame.midsHit) {
        obj.vx = (Math.random() - 0.5) * 6
        obj.vy = (Math.random() - 0.5) * 6
      }
      break
    case 'colorFlash':
      if (frame.beat) obj.colorIndex = Math.floor(Math.random() * 6)
      break
    case 'dropExplosion':
      if (beatState.dropBurst > 0.5) {
        obj.scalePulse = 2
        obj.vx = (Math.random() - 0.5) * 12
        obj.vy = (Math.random() - 0.5) * 12
      }
      break
    case 'backgroundFlash':
      break
  }

  obj.scalePulse = Math.max(1, obj.scalePulse - frame.delta * 0.003)
}

export function beatSpawnCount(behavior: BeatBehavior, frame: EngineFrame, beatState: BeatState): number {
  if (behavior !== 'burstSpawn' && behavior !== 'spawnMore') return 0
  if (beatState.dropBurst > 0.5) return 8
  if (frame.beat) return behavior === 'spawnMore' ? 3 : 2
  return 0
}
