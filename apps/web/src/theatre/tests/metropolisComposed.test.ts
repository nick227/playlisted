import { describe, expect, it } from 'vitest'

import { generateCity } from '../packages/metropolis/world/cityGen'
import { METRO_SETTINGS } from '../packages/metropolis/world/constants'
import { blockAt } from '../packages/metropolis/world/composedScene'

describe('metropolis graphic novel scene', () => {
  it('uses curated blocks instead of tile sprawl', () => {
    const grid = generateCity(METRO_SETTINGS.citySeed, 128)
    expect(grid.composedBlocks.length).toBeGreaterThanOrEqual(7)
    expect(grid.heroes.length).toBeGreaterThanOrEqual(3)

    let buildingTiles = 0
    for (const row of grid.cells) {
      for (const cell of row) {
        if (cell.floors > 0) buildingTiles++
      }
    }
    expect(buildingTiles).toBeLessThan(100)
    expect(buildingTiles).toBeGreaterThan(40)
  })

  it('places theatre and club blocks in the panel', () => {
    const grid = generateCity(METRO_SETTINGS.citySeed, 128)
    const theatre = grid.composedBlocks.find((b) => b.kind === 'grandTheatre')
    const club = grid.composedBlocks.find((b) => b.kind === 'clubFacade')
    expect(theatre).toBeDefined()
    expect(club).toBeDefined()
    expect(blockAt(grid.composedBlocks, theatre!.gx, theatre!.gy)?.kind).toBe('grandTheatre')
  })
})
