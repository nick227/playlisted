import type { DistrictId } from './types'

export type ArchetypeType =
  | 'walkup'
  | 'tower'
  | 'warehouse'
  | 'stripmall'
  | 'club'
  | 'theatre'
  | 'venue'
  | 'hospital'
  | 'diner'
  | 'loft'
  | 'shack'
  | 'skyline'

export type BuildingArchetype = {
  id: number
  type: ArchetypeType
  variant: number
  floorMul: number
  roofStyle: 'flat' | 'peaked' | 'tar'
  inset: number
  windowSparse: number
  hasBillboard: boolean
  hasAntenna: boolean
  hasFireEscape: boolean
}

const TYPES: ArchetypeType[] = [
  'walkup', 'tower', 'warehouse', 'stripmall', 'club', 'theatre',
  'venue', 'hospital', 'diner', 'loft', 'shack', 'skyline',
]

const TYPE_DEFAULTS: Record<ArchetypeType, Omit<BuildingArchetype, 'id' | 'type' | 'variant'>> = {
  walkup: { floorMul: 1, roofStyle: 'flat', inset: 0, windowSparse: 0.35, hasBillboard: false, hasAntenna: false, hasFireEscape: true },
  tower: { floorMul: 1.35, roofStyle: 'flat', inset: 0.08, windowSparse: 0.25, hasBillboard: false, hasAntenna: true, hasFireEscape: false },
  warehouse: { floorMul: 0.65, roofStyle: 'tar', inset: 0, windowSparse: 0.75, hasBillboard: false, hasAntenna: false, hasFireEscape: false },
  stripmall: { floorMul: 0.55, roofStyle: 'flat', inset: 0, windowSparse: 0.4, hasBillboard: true, hasAntenna: false, hasFireEscape: false },
  club: { floorMul: 0.85, roofStyle: 'flat', inset: 0, windowSparse: 0.5, hasBillboard: true, hasAntenna: false, hasFireEscape: false },
  theatre: { floorMul: 1.1, roofStyle: 'peaked', inset: 0, windowSparse: 0.45, hasBillboard: true, hasAntenna: false, hasFireEscape: true },
  venue: { floorMul: 0.95, roofStyle: 'flat', inset: 0.04, windowSparse: 0.4, hasBillboard: true, hasAntenna: false, hasFireEscape: false },
  hospital: { floorMul: 1.2, roofStyle: 'flat', inset: 0.06, windowSparse: 0.55, hasBillboard: false, hasAntenna: true, hasFireEscape: true },
  diner: { floorMul: 0.5, roofStyle: 'peaked', inset: 0, windowSparse: 0.3, hasBillboard: true, hasAntenna: false, hasFireEscape: false },
  loft: { floorMul: 1.05, roofStyle: 'flat', inset: 0.05, windowSparse: 0.32, hasBillboard: false, hasAntenna: false, hasFireEscape: true },
  shack: { floorMul: 0.45, roofStyle: 'tar', inset: 0, windowSparse: 0.8, hasBillboard: false, hasAntenna: false, hasFireEscape: false },
  skyline: { floorMul: 1.55, roofStyle: 'flat', inset: 0.12, windowSparse: 0.28, hasBillboard: false, hasAntenna: true, hasFireEscape: false },
}

function buildArchetypes(): BuildingArchetype[] {
  const out: BuildingArchetype[] = []
  let id = 0
  for (const type of TYPES) {
    const base = TYPE_DEFAULTS[type]
    for (let variant = 0; variant < 4; variant++) {
      out.push({
        id,
        type,
        variant,
        floorMul: base.floorMul * (1 + variant * 0.04),
        roofStyle: variant === 3 && type !== 'skyline' ? 'tar' : base.roofStyle,
        inset: base.inset + variant * 0.015,
        windowSparse: Math.min(0.9, base.windowSparse + variant * 0.04),
        hasBillboard: base.hasBillboard || variant === 2,
        hasAntenna: base.hasAntenna || (variant === 1 && type === 'tower'),
        hasFireEscape: base.hasFireEscape && variant < 3,
      })
      id++
    }
  }
  return out
}

export const BUILDING_ARCHETYPES = buildArchetypes()

const DISTRICT_TYPES: Partial<Record<DistrictId, ArchetypeType[]>> = {
  projects: ['walkup', 'shack', 'loft'],
  industrial: ['warehouse', 'shack', 'tower'],
  strip: ['stripmall', 'club', 'diner'],
  clubRow: ['club', 'venue', 'loft'],
  theatre: ['theatre', 'venue', 'walkup'],
  venue: ['venue', 'club', 'theatre'],
  horror: ['hospital', 'shack', 'warehouse'],
  haze: ['loft', 'walkup', 'shack'],
  rust: ['stripmall', 'shack', 'diner'],
  waterfront: ['warehouse', 'loft', 'walkup'],
  core: ['skyline', 'tower', 'walkup'],
  park: ['shack', 'diner'],
}

export function pickArchetypeId(district: DistrictId, seed: number): number {
  const pool = DISTRICT_TYPES[district] ?? ['walkup']
  const type = pool[Math.floor((seed % 997) / 997 * pool.length) % pool.length]
  const variant = Math.floor((seed >> 4) % 4)
  const idx = TYPES.indexOf(type) * 4 + variant
  return Math.min(BUILDING_ARCHETYPES.length - 1, idx)
}

export function archetypeById(id: number): BuildingArchetype {
  return BUILDING_ARCHETYPES[id % BUILDING_ARCHETYPES.length]
}
