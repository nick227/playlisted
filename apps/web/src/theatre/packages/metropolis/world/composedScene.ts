import { METRO_SETTINGS } from './constants'
import { DISTRICTS } from './districts'
import type { CityCell } from './types'
import type { DistrictId } from './types'
import type { HeroLandmark, HeroKind } from './heroLandmarks'

export type BlockKind =
  | 'grandTheatre'
  | 'clubFacade'
  | 'motelNeon'
  | 'projectsBlock'
  | 'walkupRow'
  | 'skylineTower'
  | 'cornerDiner'
  | 'alleyGap'

export type ComposedBlock = {
  id: string
  kind: BlockKind
  gx: number
  gy: number
  tw: number
  td: number
  floors: number
  district: DistrictId
  seed: number
}

/** Curated nightclub-row panel — graphic novel, not SimCity sprawl. */
const PANEL_BLOCKS: Omit<ComposedBlock, 'seed'>[] = [
  { id: 'theatre', kind: 'grandTheatre', gx: 50, gy: 44, tw: 4, td: 5, floors: 9, district: 'theatre' },
  { id: 'club', kind: 'clubFacade', gx: 58, gy: 46, tw: 3, td: 4, floors: 6, district: 'clubRow' },
  { id: 'motel', kind: 'motelNeon', gx: 64, gy: 45, tw: 4, td: 3, floors: 5, district: 'strip' },
  { id: 'projects', kind: 'projectsBlock', gx: 44, gy: 48, tw: 5, td: 4, floors: 7, district: 'projects' },
  { id: 'diner', kind: 'cornerDiner', gx: 70, gy: 47, tw: 2, td: 3, floors: 4, district: 'rust' },
  { id: 'walkup', kind: 'walkupRow', gx: 54, gy: 40, tw: 6, td: 2, floors: 5, district: 'haze' },
  { id: 'tower', kind: 'skylineTower', gx: 61, gy: 38, tw: 2, td: 2, floors: 14, district: 'core' },
  { id: 'alley', kind: 'alleyGap', gx: 56, gy: 52, tw: 2, td: 2, floors: 0, district: 'clubRow' },
]

const BLOCK_TO_HERO: Partial<Record<BlockKind, HeroKind>> = {
  grandTheatre: 'grandTheatre',
  clubFacade: 'clubFacade',
  motelNeon: 'motelNeon',
  projectsBlock: 'projectsYard',
}

function inBounds(gx: number, gy: number): boolean {
  const b = METRO_SETTINGS.viewBounds
  return gx >= b.gx0 && gx < b.gx1 && gy >= b.gy0 && gy < b.gy1
}

function footprintCells(block: ComposedBlock): [number, number][] {
  const out: [number, number][] = []
  for (let dy = 0; dy < block.td; dy++) {
    for (let dx = 0; dx < block.tw; dx++) {
      out.push([block.gx + dx, block.gy + dy])
    }
  }
  return out
}

export function buildComposedScene(cells: CityCell[][], seed: number): ComposedBlock[] {
  const blocks: ComposedBlock[] = PANEL_BLOCKS.map((b, i) => ({
    ...b,
    seed: seed + i * 7919,
  }))

  for (const row of cells) {
    for (const cell of row) {
      if (cell.road || cell.water || cell.rail) continue
      cell.floors = 0
    }
  }

  const claimed = new Set<string>()
  for (const block of blocks) {
    if (block.kind === 'alleyGap') continue
    for (const [gx, gy] of footprintCells(block)) {
      claimed.add(`${gx},${gy}`)
      if (gy >= cells.length || gx >= cells[0].length) continue
      const cell = cells[gy][gx]
      cell.district = block.district
      cell.floors = block.floors
    }
  }

  for (let gy = 0; gy < cells.length; gy++) {
    for (let gx = 0; gx < cells[gy].length; gx++) {
      const cell = cells[gy][gx]
      if (cell.road || cell.water || cell.rail) continue
      if (!inBounds(gx, gy)) {
        cell.floors = 0
        continue
      }
      const key = `${gx},${gy}`
      if (!claimed.has(key)) cell.floors = 0
    }
  }

  return blocks
}

export function heroesFromBlocks(blocks: ComposedBlock[]): HeroLandmark[] {
  const heroes: HeroLandmark[] = []
  for (const block of blocks) {
    const kind = BLOCK_TO_HERO[block.kind]
    if (!kind) continue
    heroes.push({
      gx: block.gx + Math.floor(block.tw / 2),
      gy: block.gy + block.td - 1,
      kind,
      seed: block.seed,
      district: block.district,
    })
  }
  return heroes
}

export function blockAt(blocks: ComposedBlock[], gx: number, gy: number): ComposedBlock | null {
  for (const block of blocks) {
    if (gx >= block.gx && gx < block.gx + block.tw && gy >= block.gy && gy < block.gy + block.td) {
      return block
    }
  }
  return null
}

export function panelDistrictStyle(district: DistrictId) {
  return DISTRICTS[district]
}
