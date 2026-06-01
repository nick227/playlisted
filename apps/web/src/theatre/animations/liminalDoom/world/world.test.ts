import { describe, expect, it } from 'vitest'

import { generateRoom } from './generator'
import { advanceWorld, createWorld, getRoomAtZ } from './world'

describe('liminal world generation', () => {
  it('generates deterministic rooms for the same seed and index', () => {
    expect(generateRoom(2, 40, { seed: 1234 })).toEqual(generateRoom(2, 40, { seed: 1234 }))
    expect(generateRoom(2, 40, { seed: 1234 })).not.toEqual(generateRoom(2, 40, { seed: 9876 }))
  })

  it('creates enough rooms ahead of the camera', () => {
    const world = createWorld({ seed: 55 })
    const lastRoom = world.rooms.at(-1)

    expect(world.rooms.length).toBeGreaterThan(2)
    expect(lastRoom?.zEnd).toBeGreaterThan(80)
    expect(world.nextIndex).toBe(world.rooms.length)
  })

  it('culls rooms behind the camera while preserving future generation state', () => {
    const initial = createWorld({ seed: 99 })
    const advanced = advanceWorld(initial, 140, { aheadDistance: 80, behindDistance: 10 })

    expect(advanced.rooms[0]?.zEnd).toBeGreaterThan(120)
    expect(advanced.nextIndex).toBeGreaterThan(initial.nextIndex)
    expect(advanced.nextZ).toBeGreaterThan(200)
  })

  it('finds the room or transition containing a z position', () => {
    const world = createWorld({ seed: 77 })
    const first = world.rooms[0]

    expect(getRoomAtZ(world, first.zStart + 1)?.id).toBe(first.id)
    expect(getRoomAtZ(world, first.zEnd + first.shell.transitionLength * 0.5)?.id).toBe(first.id)
    expect(getRoomAtZ(world, -10)).toBeNull()
  })
})
