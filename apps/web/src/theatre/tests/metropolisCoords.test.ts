import { describe, expect, it } from 'vitest'

import { BUILDING_ARCHETYPES } from '../packages/metropolis/world/buildingArchetypes'
import { buildVisibleChunks } from '../packages/metropolis/world/chunks'
import { fitCameraToCity, projectTile, depthKey, computeAutoZoom, buildingElevation } from '../packages/metropolis/world/coords'
import { generateCity, cityFingerprint } from '../packages/metropolis/world/cityGen'
import { METRO_SETTINGS, ARCHETYPE_COUNT } from '../packages/metropolis/world/constants'

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
    const fit = fitCameraToCity(METRO_SETTINGS.citySize, 1280, 720, 0.5)
    expect(Number.isFinite(fit.originX)).toBe(true)
    expect(Number.isFinite(fit.originY)).toBe(true)
  })

  it('auto zoom fits downtown view in viewport', () => {
    const zoom = computeAutoZoom(128, 1280, 720)
    expect(zoom).toBeGreaterThanOrEqual(METRO_SETTINGS.minZoom)
    expect(zoom).toBeLessThanOrEqual(METRO_SETTINGS.maxZoom)
    expect(zoom).toBeGreaterThan(0.85)
  })

  it('enforces minimum wall height in screen pixels', () => {
    const low = buildingElevation(1, 1.2)
    const high = buildingElevation(8, 1.2)
    expect(high).toBeGreaterThan(low)
    expect(low).toBeGreaterThan(1.2)
  })
})

describe('metropolis cityGen', () => {
  it('generates reproducible grid', () => {
    const a = generateCity(42, 16)
    const b = generateCity(42, 16)
    expect(a.cells[8][8].district).toBe(b.cells[8][8].district)
    expect(a.cells[8][8].floors).toBe(b.cells[8][8].floors)
    expect(a.cells[8][8].archetypeId).toBe(b.cells[8][8].archetypeId)
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

  it('produces stable fingerprint for full city seed', () => {
    const a = generateCity(METRO_SETTINGS.citySeed, 32)
    const b = generateCity(METRO_SETTINGS.citySeed, 32)
    expect(cityFingerprint(a)).toBe(cityFingerprint(b))
  })
})

describe('metropolis archetypes', () => {
  it('defines 48 building variants', () => {
    expect(BUILDING_ARCHETYPES.length).toBe(ARCHETYPE_COUNT)
    const ids = new Set(BUILDING_ARCHETYPES.map((a) => a.id))
    expect(ids.size).toBe(48)
  })
})

describe('metropolis chunks', () => {
  it('culls off-screen chunks when zoomed in', () => {
    const cam = { originX: 200, originY: 500, zoom: 1.05, swayX: 0, swayY: 0 }
    const visible = buildVisibleChunks(128, cam, 1280, 720)
    expect(visible.size).toBeGreaterThan(0)
    expect(visible.size).toBeLessThan(128)
  })
})
