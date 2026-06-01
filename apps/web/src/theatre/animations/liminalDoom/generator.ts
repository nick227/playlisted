import type { LiminalRoom, RoomGenerationOptions, SceneType, WatchBudget } from './types'

const SCENE_TYPES: SceneType[] = ['bandStage', 'bar', 'danceFloor', 'conversation', 'hallwayCrowd']

const DEFAULT_OPTIONS: Required<RoomGenerationOptions> = {
  seed: 7331,
  minRoomLength: 18,
  maxRoomLength: 30,
  minTransitionLength: 5,
  maxTransitionLength: 10,
}

export function normalizeGenerationOptions(options: RoomGenerationOptions = {}) {
  return { ...DEFAULT_OPTIONS, ...options }
}

export function hashSeed(seed: number, salt: number) {
  let value = (seed ^ Math.imul(salt + 0x9e3779b9, 0x85ebca6b)) >>> 0
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d) >>> 0
  value ^= value >>> 15
  value = Math.imul(value, 0x846ca68b) >>> 0
  value ^= value >>> 16
  return value >>> 0
}

export function random01(seed: number, salt: number) {
  return hashSeed(seed, salt) / 0xffffffff
}

export function randomRange(seed: number, salt: number, min: number, max: number) {
  return min + (max - min) * random01(seed, salt)
}

export function pickSceneType(seed: number, roomIndex: number): SceneType {
  const value = random01(seed, roomIndex * 17 + 3)
  const index = Math.min(SCENE_TYPES.length - 1, Math.floor(value * SCENE_TYPES.length))
  return SCENE_TYPES[index]
}

export function getWatchBudget(sceneType: SceneType, intensity: number): WatchBudget {
  switch (sceneType) {
    case 'bandStage':
    case 'danceFloor':
      return { min: 12, target: 14 + intensity * 6, max: 20 }
    case 'conversation':
      return { min: 10, target: 10 + intensity * 6, max: 16 }
    case 'hallwayCrowd':
      return { min: 8, target: 8 + intensity * 4, max: 12 }
    case 'bar':
      return { min: 10, target: 12 + intensity * 4, max: 16 }
  }
}

export function generateRoom(
  index: number,
  zStart: number,
  options: RoomGenerationOptions = {},
): LiminalRoom {
  const resolved = normalizeGenerationOptions(options)
  const roomSeed = hashSeed(resolved.seed, index + 1)
  const sceneType = pickSceneType(resolved.seed, index)
  const intensity = random01(roomSeed, 11)
  const length = randomRange(roomSeed, 23, resolved.minRoomLength, resolved.maxRoomLength)
  const transitionLength = randomRange(
    roomSeed,
    29,
    resolved.minTransitionLength,
    resolved.maxTransitionLength,
  )
  const width = randomRange(roomSeed, 31, 8, 13)
  const height = randomRange(roomSeed, 37, 5.5, 8)
  const zEnd = zStart + length

  return {
    id: `room-${index}-${roomSeed.toString(16)}`,
    index,
    seed: roomSeed,
    sceneType,
    zStart,
    zEnd,
    holdZ: zEnd - Math.min(5, length * 0.24),
    shell: {
      width,
      height,
      length,
      transitionLength,
    },
    watchBudget: getWatchBudget(sceneType, intensity),
    intensity,
  }
}
