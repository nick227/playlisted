import { generateRoom, normalizeGenerationOptions } from './generator'
import type { LiminalRoom, LiminalWorld, RoomGenerationOptions } from '../core/types'

export type WorldAdvanceOptions = RoomGenerationOptions & {
  aheadDistance?: number
  behindDistance?: number
}

const DEFAULT_AHEAD_DISTANCE = 90
const DEFAULT_BEHIND_DISTANCE = 24

export function createWorld(options: RoomGenerationOptions = {}): LiminalWorld {
  const resolved = normalizeGenerationOptions(options)
  return ensureRoomsAhead(
    {
      seed: resolved.seed,
      rooms: [],
      nextIndex: 0,
      nextZ: 0,
    },
    0,
    options,
  )
}

export function ensureRoomsAhead(
  world: LiminalWorld,
  cameraZ: number,
  options: WorldAdvanceOptions = {},
): LiminalWorld {
  const aheadDistance = options.aheadDistance ?? DEFAULT_AHEAD_DISTANCE
  const generationOptions = { ...options, seed: world.seed }
  const rooms = [...world.rooms]
  let nextIndex = world.nextIndex
  let nextZ = world.nextZ

  while (nextZ < cameraZ + aheadDistance) {
    const room = generateRoom(nextIndex, nextZ, generationOptions)
    rooms.push(room)
    nextIndex += 1
    nextZ = room.zEnd + room.shell.transitionLength
  }

  return { ...world, rooms, nextIndex, nextZ }
}

export function cullRoomsBehind(
  world: LiminalWorld,
  cameraZ: number,
  behindDistance = DEFAULT_BEHIND_DISTANCE,
): LiminalWorld {
  const rooms = world.rooms.filter((room) => room.zEnd + room.shell.transitionLength >= cameraZ - behindDistance)
  return { ...world, rooms }
}

export function advanceWorld(
  world: LiminalWorld,
  cameraZ: number,
  options: WorldAdvanceOptions = {},
): LiminalWorld {
  const aheadDistance = options.aheadDistance ?? DEFAULT_AHEAD_DISTANCE
  const behindDistance = options.behindDistance ?? DEFAULT_BEHIND_DISTANCE

  const needsAhead = world.nextZ < cameraZ + aheadDistance
  const needsCull =
    world.rooms.length > 0 &&
    world.rooms[0].zEnd + world.rooms[0].shell.transitionLength < cameraZ - behindDistance

  if (!needsAhead && !needsCull) return world

  const withFutureRooms = needsAhead ? ensureRoomsAhead(world, cameraZ, options) : world
  return needsCull ? cullRoomsBehind(withFutureRooms, cameraZ, behindDistance) : withFutureRooms
}

export function getRoomAtZ(world: LiminalWorld, z: number): LiminalRoom | null {
  return (
    world.rooms.find((room) => z >= room.zStart && z <= room.zEnd + room.shell.transitionLength) ?? null
  )
}

export function getUpcomingRoom(world: LiminalWorld, z: number): LiminalRoom | null {
  return world.rooms.find((room) => room.zEnd >= z) ?? world.rooms.at(-1) ?? null
}
