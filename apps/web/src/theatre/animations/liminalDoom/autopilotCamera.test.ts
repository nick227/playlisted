import { describe, expect, it } from 'vitest'

import { createAutopilotState, getTargetWatchDuration, updateAutopilotCamera } from './autopilotCamera'
import { createWorld } from './world'

describe('liminal autopilot camera', () => {
  it('moves forward with synthetic no-audio motion', () => {
    const world = createWorld({ seed: 42 })
    let state = createAutopilotState({ seed: 42 })

    for (let frame = 0; frame < 120; frame += 1) {
      state = updateAutopilotCamera(state, world, 1 / 60)
    }

    expect(state.camera.position.z).toBeGreaterThan(4)
    expect(Math.abs(state.camera.position.x)).toBeGreaterThan(0.01)
    expect(state.phase).toBe('approach')
  })

  it('holds at a room watch point before completing that room', () => {
    const world = createWorld({ seed: 9 })
    const first = world.rooms[0]
    let state = createAutopilotState({ seed: 9, startZ: first.holdZ })

    state = updateAutopilotCamera(state, world, 1 / 60)

    expect(state.phase).toBe('watch')
    expect(state.watchRoomId).toBe(first.id)
    expect(state.camera.position.z).toBeCloseTo(first.holdZ)

    const targetWatch = getTargetWatchDuration(first)
    for (let frame = 0; frame < Math.ceil(targetWatch * 60) + 1; frame += 1) {
      state = updateAutopilotCamera(state, world, 1 / 60)
    }

    expect(state.completedRoomIds.has(first.id)).toBe(true)
    expect(state.watchRoomId).toBeNull()
  })

  it('lets onset events trigger passage after a room hold begins', () => {
    const world = createWorld({ seed: 10 })
    const first = world.rooms[0]
    let state = createAutopilotState({ seed: 10, startZ: first.holdZ })

    state = updateAutopilotCamera(state, world, 0.25)
    expect(state.phase).toBe('watch')

    state = updateAutopilotCamera(state, world, 0.25, { onset: true })
    expect(state.phase).toBe('threshold')
    expect(state.completedRoomIds.has(first.id)).toBe(true)
    expect(state.passagePulse).toBe(1)
  })
})
