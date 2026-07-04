import type { CityCell } from './types'
import type { DistrictId } from './types'

export type HeroKind =
  | 'grandTheatre'
  | 'motelNeon'
  | 'hospital'
  | 'skylineTower'
  | 'clubFacade'
  | 'projectsYard'
  | 'waterfrontPier'
  | 'industrialStack'

export type HeroLandmark = {
  gx: number
  gy: number
  kind: HeroKind
  seed: number
  district: DistrictId
}

type HeroSlot = {
  kind: HeroKind
  district: DistrictId
  anchorX: number
  anchorY: number
  minFloors: number
}

const HERO_MIN_FLOORS: Record<HeroKind, number> = {
  grandTheatre: 6,
  motelNeon: 3,
  hospital: 7,
  skylineTower: 10,
  clubFacade: 4,
  projectsYard: 4,
  waterfrontPier: 2,
  industrialStack: 5,
}

function snapToBuilding(
  cells: CityCell[][],
  size: number,
  ax: number,
  ay: number,
  district: DistrictId,
): [number, number] | null {
  let best: [number, number] | null = null
  let bestFloors = 0
  for (let r = 0; r <= 10; r++) {
    for (let gy = ay - r; gy <= ay + r; gy++) {
      for (let gx = ax - r; gx <= ax + r; gx++) {
        if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue
        const cell = cells[gy][gx]
        if (cell.district !== district || cell.floors <= 0 || cell.road || cell.water) continue
        if (cell.floors >= bestFloors) {
          bestFloors = cell.floors
          best = [gx, gy]
        }
      }
    }
    if (best) return best
  }
  return null
}

export function generateHeroLandmarks(cells: CityCell[][], size: number): HeroLandmark[] {
  const slots: HeroSlot[] = [
    { kind: 'grandTheatre', district: 'theatre', anchorX: Math.floor(size * 0.52), anchorY: Math.floor(size * 0.62), minFloors: 6 },
    { kind: 'motelNeon', district: 'strip', anchorX: Math.floor(size * 0.74), anchorY: Math.floor(size * 0.66), minFloors: 3 },
    { kind: 'clubFacade', district: 'clubRow', anchorX: Math.floor(size * 0.58), anchorY: Math.floor(size * 0.55), minFloors: 4 },
    { kind: 'hospital', district: 'horror', anchorX: Math.floor(size * 0.22), anchorY: Math.floor(size * 0.72), minFloors: 7 },
    { kind: 'skylineTower', district: 'core', anchorX: Math.floor(size * 0.48), anchorY: Math.floor(size * 0.38), minFloors: 10 },
    { kind: 'projectsYard', district: 'projects', anchorX: Math.floor(size * 0.28), anchorY: Math.floor(size * 0.52), minFloors: 4 },
    { kind: 'waterfrontPier', district: 'waterfront', anchorX: size - 12, anchorY: 8, minFloors: 2 },
    { kind: 'industrialStack', district: 'industrial', anchorX: Math.floor(size * 0.12), anchorY: Math.floor(size * 0.18), minFloors: 5 },
  ]

  const heroes: HeroLandmark[] = []
  const used = new Set<string>()
  for (const slot of slots) {
    const snap = snapToBuilding(cells, size, slot.anchorX, slot.anchorY, slot.district)
    if (!snap) continue
    const [gx, gy] = snap
    const key = `${gx},${gy}`
    if (used.has(key)) continue
    used.add(key)
    const cell = cells[gy][gx]
    cell.floors = Math.max(cell.floors, HERO_MIN_FLOORS[slot.kind])
    heroes.push({ gx, gy, kind: slot.kind, seed: cell.seed, district: slot.district })
  }
  return heroes
}

export function heroAt(heroes: HeroLandmark[], gx: number, gy: number): HeroLandmark | null {
  return heroes.find((h) => h.gx === gx && h.gy === gy) ?? null
}
