import { METRO_SETTINGS } from './constants'
import { generateLandmarks, generateStreetProps } from './cityProps'
import { generateHeroLandmarks } from './heroLandmarks'
import { archetypeById, pickArchetypeId } from './buildingArchetypes'
import { districtAt, DISTRICTS } from './districts'
import { isRail, isRoad, isWater } from './roads'
import { rand01 } from './rng'
import type { CityCell } from './types'
import type { Landmark, StreetProp } from './cityProps'
import type { HeroLandmark } from './heroLandmarks'

export type CityGrid = {
  size: number
  cells: CityCell[][]
  streetProps: StreetProp[]
  landmarks: Landmark[]
  heroes: HeroLandmark[]
}

export function generateCity(seed: number, size: number = METRO_SETTINGS.citySize): CityGrid {
  const cells: CityCell[][] = []
  for (let gy = 0; gy < size; gy++) {
    const row: CityCell[] = []
    for (let gx = 0; gx < size; gx++) {
      const district = districtAt(gx, gy, size)
      const style = DISTRICTS[district]
      const cellSeed = seed + gx * 928371 + gy * 689287
      const road = isRoad(gx, gy, size) || isRail(gx, gy)
      const water = !road && isWater(gx, gy, size)
      const rail = isRail(gx, gy)
      const r = rand01(cellSeed, gx, gy)
      const archetypeId = pickArchetypeId(district, cellSeed)
      const arch = archetypeById(archetypeId)
      const rawFloors = road || water || style.maxFloors === 0
        ? 0
        : 1 + Math.floor(r * style.maxFloors)
      const floors = rawFloors > 0 ? Math.max(1, Math.round(rawFloors * arch.floorMul)) : 0
      row.push({ district, floors, road, water, rail, seed: cellSeed, archetypeId })
    }
    cells.push(row)
  }
  return {
    size,
    cells,
    streetProps: generateStreetProps(cells, size),
    landmarks: generateLandmarks(cells, size),
    heroes: generateHeroLandmarks(cells, size),
  }
}

export function cellAt(grid: CityGrid, gx: number, gy: number): CityCell | null {
  if (gx < 0 || gy < 0 || gx >= grid.size || gy >= grid.size) return null
  return grid.cells[gy][gx]
}

export function cityFingerprint(grid: CityGrid): string {
  let h = 0
  for (const row of grid.cells) {
    for (const c of row) {
      h = (h * 31 + c.archetypeId) | 0
      h = (h * 31 + c.floors) | 0
    }
  }
  return `${grid.size}:${h}`
}
