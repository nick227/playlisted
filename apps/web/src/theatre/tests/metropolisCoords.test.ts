import { describe, expect, it } from 'vitest'

import { fitCameraToCity, projectTile, depthKey } from '../packages/metropolis/world/coords'
import { generateCity } from '../packages/metropolis/world/cityGen'
import { METRO_SETTINGS } from '../packages/metropolis/world/constants'

describe('metropolis coords', () => {
  const cam = { originX: 400, originY: 300, zoom: 1, swayX: 0, swayY: 0 }

  it('sorts nearer tiles behind farther tiles on diagonal', () => {
    expect(depthKey(0, 0)).toBeLessThan(depthKey(5, 5))
    expect(depthKey(2, 3)).toBeLessThan(depthKey(3, 3))
  })

  it('raises elevation on screen Y', () => {
    const low = projectTile(10, 10, 0, cam)
    const high = projectTile(10, 10, 4, cam)
    expect(high.sy).toBeLessThan(low.sy)
  })

  it('fits camera without throwing for full city', () => {
    const fit = fitCameraToCity(METRO_SETTINGS.citySize, 1280, 720, 0.95)
    expect(Number.isFinite(fit.originX)).toBe(true)
    expect(Number.isFinite(fit.originY)).toBe(true)
  })
})

describe('metropolis cityGen', () => {
  it('generates reproducible grid', () => {
    const a = generateCity(42, 16)
    const b = generateCity(42, 16)
    expect(a.cells[8][8].district).toBe(b.cells[8][8].district)
    expect(a.cells[8][8].floors).toBe(b.cells[8][8].floors)
  })

  it('includes roads and buildings', () => {
    const grid = generateCity(METRO_SETTINGS.citySeed, 24)
    let roads = 0
    let buildings = 0
    for (const row of grid.cells) {
      for (const cell of row) {
        if (cell.road) roads++
        if (cell.floors > 0) buildings++
      }
    }
    expect(roads).toBeGreaterThan(10)
    expect(buildings).toBeGreaterThan(10)
  })
})
