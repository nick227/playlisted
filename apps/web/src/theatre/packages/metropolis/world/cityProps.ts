import type { DistrictId } from './types'

export type StreetPropKind = 'lamp' | 'hydrant' | 'barrier' | 'dumpster'

export type StreetProp = {
  gx: number
  gy: number
  kind: StreetPropKind
  seed: number
}

export type LandmarkKind = 'crane' | 'boat' | 'spotlight' | 'billboardTower'

export type Landmark = {
  gx: number
  gy: number
  kind: LandmarkKind
  seed: number
  district: DistrictId
}

const PROP_WEIGHTS: Partial<Record<DistrictId, StreetPropKind[]>> = {
  core: ['lamp', 'lamp', 'barrier'],
  strip: ['lamp', 'dumpster'],
  clubRow: ['lamp', 'barrier'],
  industrial: ['barrier', 'dumpster'],
  projects: ['hydrant', 'dumpster'],
  rust: ['hydrant', 'dumpster'],
  waterfront: ['lamp', 'barrier'],
}

function adjacentToRoad(cells: { road: boolean; water: boolean }[][], gx: number, gy: number, size: number): boolean {
  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  for (const [dx, dy] of neighbors) {
    const nx = gx + dx
    const ny = gy + dy
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
    if (cells[ny][nx].road) return true
  }
  return false
}

export function generateStreetProps(
  cells: { road: boolean; water: boolean; district: DistrictId; seed: number; floors: number }[][],
  size: number,
): StreetProp[] {
  const props: StreetProp[] = []
  for (let gy = 1; gy < size - 1; gy++) {
    for (let gx = 1; gx < size - 1; gx++) {
      const cell = cells[gy][gx]
      if (cell.road || cell.water || cell.floors > 0) continue
      if (!adjacentToRoad(cells, gx, gy, size)) continue
      if ((cell.seed % 17) / 17 > 0.82) continue
      const pool = PROP_WEIGHTS[cell.district] ?? ['lamp']
      const kind = pool[cell.seed % pool.length]
      props.push({ gx: gx + 0.15, gy: gy + 0.15, kind, seed: cell.seed })
    }
  }
  return props
}

export function generateLandmarks(
  cells: { district: DistrictId; water: boolean; seed: number }[][],
  size: number,
): Landmark[] {
  const out: Landmark[] = []
  const slots: [number, number, LandmarkKind][] = [
    [size - 14, 6, 'crane'],
    [size - 9, 12, 'crane'],
    [size - 6, 4, 'boat'],
    [size - 11, 18, 'boat'],
    [Math.floor(size * 0.55), Math.floor(size * 0.48), 'spotlight'],
    [Math.floor(size * 0.42), Math.floor(size * 0.35), 'billboardTower'],
  ]
  for (const [gx, gy, kind] of slots) {
    if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue
    out.push({ gx, gy, kind, seed: cells[gy][gx].seed, district: cells[gy][gx].district })
  }
  return out
}
