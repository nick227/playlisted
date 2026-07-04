import { METRO_SETTINGS } from './constants'
import { districtAt, DISTRICTS } from './districts'
import { rand01 } from './rng'
import type { CityCell } from './types'

export type CityGrid = {
  size: number
  cells: CityCell[][]
}

function isRoad(gx: number, gy: number, size: number): boolean {
  if (gx === 0 || gy === 0 || gx === size - 1 || gy === size - 1) return true
  if (gx % 4 === 0 || gy % 4 === 0) return true
  if (gx === Math.floor(size / 2) || gy === Math.floor(size / 2)) return true
  return false
}

function isWater(gx: number, gy: number, size: number): boolean {
  return gx >= size - 8 && gy < 10
}

export function generateCity(seed: number, size: number = METRO_SETTINGS.citySize): CityGrid {
  const cells: CityCell[][] = []
  for (let gy = 0; gy < size; gy++) {
    const row: CityCell[] = []
    for (let gx = 0; gx < size; gx++) {
      const district = districtAt(gx, gy, size)
      const style = DISTRICTS[district]
      const cellSeed = seed + gx * 928371 + gy * 689287
      const road = isRoad(gx, gy, size)
      const water = !road && isWater(gx, gy, size)
      const r = rand01(cellSeed, gx, gy)
      const floors = road || water || style.maxFloors === 0
        ? 0
        : 1 + Math.floor(r * style.maxFloors)
      row.push({ district, floors, road, water, seed: cellSeed })
    }
    cells.push(row)
  }
  return { size, cells }
}

export function cellAt(grid: CityGrid, gx: number, gy: number): CityCell | null {
  if (gx < 0 || gy < 0 || gx >= grid.size || gy >= grid.size) return null
  return grid.cells[gy][gx]
}
