import { describe, expect, it } from 'vitest'

import { applyBlackoutFreeze } from '../packages/metropolis/entities/humanReactions'
import type { HumanFigure } from '../packages/metropolis/entities/humanFigure'
import { spawnHumanDrama } from '../packages/metropolis/world/humanSpawn'
import { generateCity } from '../packages/metropolis/world/cityGen'
import { METRO_SETTINGS } from '../packages/metropolis/world/constants'

function stubFigure(overrides: Partial<HumanFigure> = {}): HumanFigure {
  return {
    id: 0, gx: 20, gy: 40, displayGx: 20, displayGy: 40, role: 'wanderer', dir: 1,
    speed: 0.004, vx: 0, vy: 0, freezeMs: 0, scatterMs: 0, bob: 0, armsUp: 0, seed: 1,
    queueSlot: 0, anchorGx: 20, anchorGy: 40, ...overrides,
  }
}

describe('metropolis human drama', () => {
  it('spawns queues, rooftops, and wanderers', () => {
    const grid = generateCity(METRO_SETTINGS.citySeed, 64)
    const drama = spawnHumanDrama(grid)
    expect(drama.figures.length).toBeGreaterThan(8)
    expect(drama.figures.some((f) => f.role === 'queue')).toBe(true)
    expect(drama.figures.some((f) => f.role === 'rooftop')).toBe(true)
    expect(drama.figures.some((f) => f.role === 'wanderer')).toBe(true)
  })

  it('freezes figures during blackout wave', () => {
    const fig = stubFigure()
    const frozen = applyBlackoutFreeze(fig, 10, 50, 128, {
      blackout: 1, blackoutWave: 0.9, blackoutRolling: true,
    }, 16)
    expect(frozen).toBe(true)
    expect(fig.freezeMs).toBeGreaterThan(0)
  })
})
